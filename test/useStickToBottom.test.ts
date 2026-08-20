/*!---------------------------------------------------------------------------------------------
 *  Copyright (c) StackBlitz. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStickToBottom } from "../src/useStickToBottom";

type ResizeCallback = (entries: { contentRect: { height: number } }[]) => void;

const CLIENT_HEIGHT = 500;
const INITIAL_CONTENT_HEIGHT = 1000;

let resizeCallbacks: ResizeCallback[] = [];

class MockResizeObserver {
	constructor(callback: ResizeCallback) {
		resizeCallbacks.push(callback);
	}

	observe() {}
	unobserve() {}
	disconnect() {}
}

/**
 * jsdom has no layout engine, so the scroll geometry that the hook reads is
 * defined by hand, and content resizes are delivered by invoking the observer
 * callback directly.
 */
function createScrollElements() {
	const scrollElement = document.createElement("div");
	const contentElement = document.createElement("div");

	scrollElement.appendChild(contentElement);
	document.body.appendChild(scrollElement);

	let scrollHeight = INITIAL_CONTENT_HEIGHT;
	let scrollTop = 0;

	Object.defineProperty(scrollElement, "clientHeight", {
		configurable: true,
		get: () => CLIENT_HEIGHT,
	});

	Object.defineProperty(scrollElement, "scrollHeight", {
		configurable: true,
		get: () => scrollHeight,
	});

	Object.defineProperty(scrollElement, "scrollTop", {
		configurable: true,
		get: () => scrollTop,
		set: (value: number) => {
			scrollTop = Math.max(0, Math.min(value, scrollHeight - CLIENT_HEIGHT));
		},
	});

	return {
		scrollElement,
		contentElement,

		/**
		 * The scroll position the hook sticks to, as derived by the hook itself.
		 */
		get targetScrollTop() {
			return scrollHeight - 1 - CLIENT_HEIGHT;
		},

		/**
		 * Grows or shrinks the content and delivers the resize to the observer,
		 * the way a streamed message would.
		 */
		resize(height: number) {
			scrollHeight = height;

			for (const callback of resizeCallbacks) {
				callback([{ contentRect: { height } }]);
			}
		},

		/**
		 * A scroll that the hook did not perform itself - a user dragging the
		 * scrollbar, a touch drag, or a keyboard scroll. It deliberately writes
		 * the DOM property directly so that `ignoreScrollToTop` stays unset.
		 */
		userScrollTo(value: number) {
			scrollElement.scrollTop = value;
			scrollElement.dispatchEvent(new Event("scroll"));
		},
	};
}

type Harness = ReturnType<typeof createScrollElements>;

function renderStickToBottom(harness: Harness) {
	const { result } = renderHook(() => useStickToBottom());

	act(() => {
		result.current.scrollRef(harness.scrollElement);
		result.current.contentRef(harness.contentElement);
	});

	return result;
}

/**
 * Leaves the reader locked to the bottom with a resize in flight, which is the
 * steady state while a message streams in.
 */
function streamToBottom(
	harness: Harness,
	result: { current: ReturnType<typeof useStickToBottom> },
) {
	act(() => {
		harness.resize(INITIAL_CONTENT_HEIGHT);
	});

	act(() => {
		harness.userScrollTo(harness.targetScrollTop);
	});

	act(() => {
		harness.resize(INITIAL_CONTENT_HEIGHT + 400);
	});

	expect(result.current.state.resizeDifference).not.toBe(0);
	expect(result.current.state.isAtBottom).toBe(true);
}

describe("useStickToBottom", () => {
	beforeEach(() => {
		resizeCallbacks = [];
		globalThis.ResizeObserver =
			MockResizeObserver as unknown as typeof ResizeObserver;

		// The hook defers part of its scroll handling by 1ms; faking only the
		// timers keeps that deferral controllable while leaving the animation
		// loop's requestAnimationFrame untouched.
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = "";
	});

	it("releases the lock when the user scrolls away while the content resizes", () => {
		const harness = createScrollElements();
		const result = renderStickToBottom(harness);

		streamToBottom(harness, result);

		act(() => {
			harness.userScrollTo(200);
		});

		expect(result.current.state.isAtBottom).toBe(false);
		expect(result.current.escapedFromLock).toBe(true);
		expect(result.current.isAtBottom).toBe(false);

		// A further resize must not pull the reader back down.
		act(() => {
			harness.resize(INITIAL_CONTENT_HEIGHT + 800);
		});

		expect(result.current.state.isAtBottom).toBe(false);
		expect(harness.scrollElement.scrollTop).toBe(200);
	});

	it("keeps the release after the deferred handler runs", () => {
		const harness = createScrollElements();
		const result = renderStickToBottom(harness);

		streamToBottom(harness, result);

		act(() => {
			harness.userScrollTo(200);
		});

		act(() => {
			vi.advanceTimersByTime(5);
		});

		expect(result.current.state.isAtBottom).toBe(false);
		expect(result.current.escapedFromLock).toBe(true);
	});

	it("keeps the lock when the resize itself moves the scroll position", () => {
		const harness = createScrollElements();
		const result = renderStickToBottom(harness);

		act(() => {
			harness.resize(INITIAL_CONTENT_HEIGHT);
		});

		act(() => {
			harness.userScrollTo(harness.targetScrollTop);
		});

		// Shrinking the content forces the hook to pull the scroll position back
		// to the new target, which marks the scroll via `ignoreScrollToTop`.
		act(() => {
			harness.resize(INITIAL_CONTENT_HEIGHT - 300);
		});

		expect(harness.scrollElement.scrollTop).toBe(harness.targetScrollTop);
		expect(result.current.state.ignoreScrollToTop).toBe(
			harness.targetScrollTop,
		);

		act(() => {
			harness.scrollElement.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(5);
		});

		expect(result.current.state.isAtBottom).toBe(true);
		expect(result.current.escapedFromLock).toBe(false);
	});

	it("keeps the lock when a scroll during a resize stays near the bottom", () => {
		const harness = createScrollElements();
		const result = renderStickToBottom(harness);

		streamToBottom(harness, result);

		// Caught up with the grown content, then nudged up by less than the
		// stick-to-bottom offset - too small to read as leaving the bottom.
		act(() => {
			harness.userScrollTo(harness.targetScrollTop);
		});

		act(() => {
			harness.userScrollTo(harness.targetScrollTop - 20);
		});

		expect(result.current.state.isAtBottom).toBe(true);
		expect(result.current.escapedFromLock).toBe(false);
	});

	it("honours ignoreEscapes when the user scrolls away during a resize", () => {
		const harness = createScrollElements();
		const result = renderStickToBottom(harness);

		streamToBottom(harness, result);

		const lastScrollTop = harness.scrollElement.scrollTop;

		result.current.state.animation = {
			behavior: "instant",
			ignoreEscapes: true,
			promise: Promise.resolve(true),
		};

		act(() => {
			harness.userScrollTo(200);
		});

		expect(result.current.state.isAtBottom).toBe(true);
		expect(result.current.escapedFromLock).toBe(false);

		// The deferred handler restores the position the escape tried to leave.
		act(() => {
			vi.advanceTimersByTime(5);
		});

		expect(harness.scrollElement.scrollTop).toBe(lastScrollTop);
		expect(result.current.state.isAtBottom).toBe(true);
		expect(result.current.escapedFromLock).toBe(false);
	});
});
