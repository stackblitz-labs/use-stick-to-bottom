/*!---------------------------------------------------------------------------------------------
 *  Copyright (c) StackBlitz. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react";
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import {
	type GetTargetScrollTop,
	type ScrollToBottom,
	type StickToBottomOptions,
	type StickToBottomState,
	type StopScroll,
	useStickToBottom,
} from "./useStickToBottom.js";

export interface StickToBottomContext {
	contentRef: React.MutableRefObject<HTMLElement | null> &
		React.RefCallback<HTMLElement>;
	scrollRef: React.MutableRefObject<HTMLElement | null> &
		React.RefCallback<HTMLElement>;
	scrollToBottom: ScrollToBottom;
	stopScroll: StopScroll;
	isAtBottom: boolean;
	escapedFromLock: boolean;
	get targetScrollTop(): GetTargetScrollTop | null;
	set targetScrollTop(targetScrollTop: GetTargetScrollTop | null);
	state: StickToBottomState;
	scrollMode: "element" | "document"; // Add scrollMode to context
}

const StickToBottomContext = createContext<StickToBottomContext | null>(null);

export interface StickToBottomProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
		StickToBottomOptions {
	contextRef?: React.Ref<StickToBottomContext>;
	instance?: ReturnType<typeof useStickToBottom>;
	children: ((context: StickToBottomContext) => ReactNode) | ReactNode;
	scrollMode?: "element" | "document"; // Add scrollMode prop
}

const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function StickToBottom({
	instance,
	children,
	resize,
	initial,
	mass,
	damping,
	stiffness,
	targetScrollTop: currentTargetScrollTop,
	scrollMode = "element", // Destructure scrollMode prop with default
	contextRef,
	...props
}: StickToBottomProps) {
	const customTargetScrollTop = useRef<GetTargetScrollTop | null>(null);

	const targetScrollTop = React.useCallback<GetTargetScrollTop>(
		(target, elements) => {
			const get = context?.targetScrollTop ?? currentTargetScrollTop;
			return get?.(target, elements) ?? target;
		},
		[currentTargetScrollTop],
	);

	const defaultInstance = useStickToBottom({
		mass,
		damping,
		stiffness,
		resize,
		initial,
		targetScrollTop,
		scrollMode, // Pass scrollMode to the hook
	});

	const {
		scrollRef,
		contentRef,
		scrollToBottom,
		stopScroll,
		isAtBottom,
		escapedFromLock,
		state,
		// Destructure scrollMode from hook result (though we already have it from props)
		// Might be useful if using a passed-in instance
		scrollMode: instanceScrollMode,
	} = instance ?? defaultInstance;

	// Use the scrollMode passed via props primarily, fallback to instance if provided externally
	const effectiveScrollMode = instance ? instanceScrollMode : scrollMode;

const context = useMemo<StickToBottomContext>(
() => ({
scrollToBottom,
stopScroll,
scrollRef,
isAtBottom,
escapedFromLock,
contentRef,
state,
scrollMode: effectiveScrollMode, // Add scrollMode to context value
get targetScrollTop() {
return customTargetScrollTop.current;
},
set targetScrollTop(targetScrollTop: GetTargetScrollTop | null) {
customTargetScrollTop.current = targetScrollTop;
},
}),
[
scrollToBottom,
isAtBottom,
contentRef,
scrollRef,
stopScroll,
escapedFromLock,
state,
effectiveScrollMode, // Add effectiveScrollMode to dependency array
],
);

	useImperativeHandle(contextRef, () => context, [context]);

	// Conditionally apply overflow style only in element mode
	useIsomorphicLayoutEffect(() => {
		if (effectiveScrollMode === "element" && scrollRef.current) {
			if (getComputedStyle(scrollRef.current).overflow === "visible") {
				scrollRef.current.style.overflow = "auto";
			}
		}
		// Add effectiveScrollMode to dependency array
	}, [effectiveScrollMode]);

	return (
		<StickToBottomContext.Provider value={context}>
			<div {...props}>
				{typeof children === "function" ? children(context) : children}
			</div>
		</StickToBottomContext.Provider>
	);
}

export namespace StickToBottom {
	export interface ContentProps
		extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
		children: ((context: StickToBottomContext) => ReactNode) | ReactNode;
	}

	export function Content({ children, ...props }: ContentProps) {
		const context = useStickToBottomContext();

		// In 'document' mode, don't render the outer scroll div
		if (context.scrollMode === "document") {
			return (
				<div {...props} ref={context.contentRef}>
					{typeof children === "function" ? children(context) : children}
				</div>
			);
		}

		// Default 'element' mode rendering
		return (
			<div
				ref={context.scrollRef}
				style={{
					height: "100%",
					width: "100%",
				}}
			>
				<div {...props} ref={context.contentRef}>
					{typeof children === "function" ? children(context) : children}
				</div>
			</div>
		);
	}
}

/**
 * Use this hook inside a <StickToBottom> component to gain access to whether the component is at the bottom of the scrollable area.
 */
export function useStickToBottomContext() {
	const context = useContext(StickToBottomContext);
	if (!context) {
		throw new Error(
			"use-stick-to-bottom component context must be used within a StickToBottom component",
		);
	}

	return context;
}
