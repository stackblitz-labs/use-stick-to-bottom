/*!---------------------------------------------------------------------------------------------
 *  Copyright (c) StackBlitz. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  ScrollToBottom,
  StopScroll,
  StickToBottomOptions,
  useStickToBottom,
  GetTargetScrollTop,
  StickToBottomState,
} from './useStickToBottom.js';

export interface StickToBottomContext {
  contentRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
  scrollRef: React.MutableRefObject<HTMLElement | null> & React.RefCallback<HTMLElement>;
  scrollToBottom: ScrollToBottom;
  stopScroll: StopScroll;
  isAtBottom: boolean;
  isNearBottom: boolean;
  escapedFromLock: boolean;
  targetScrollTop?: GetTargetScrollTop | null;
  state: StickToBottomState;
}

const StickToBottomContext = createContext<StickToBottomContext | null>(null);

export interface StickToBottomProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    StickToBottomOptions {
  instance?: ReturnType<typeof useStickToBottom>;
  children: ((context: StickToBottomContext) => ReactNode) | ReactNode;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function StickToBottom({
  instance,
  children,
  resize,
  initial,
  mass,
  damping,
  stiffness,
  targetScrollTop: currentTargetScrollTop,
  ...props
}: StickToBottomProps) {
  const targetScrollTop = React.useCallback<GetTargetScrollTop>(
    (target, elements) => {
      const get = context.targetScrollTop ?? currentTargetScrollTop;
      return get?.(target, elements) ?? target;
    },
    [currentTargetScrollTop]
  );

  const defaultInstance = useStickToBottom({
    mass,
    damping,
    stiffness,
    resize,
    initial,
    targetScrollTop,
  });

  const { scrollRef, contentRef, scrollToBottom, stopScroll, isAtBottom, isNearBottom, escapedFromLock, state } =
    instance ?? defaultInstance;

  const context = useMemo<StickToBottomContext>(
    () => ({
      scrollToBottom,
      stopScroll,
      scrollRef,
      isAtBottom,
      isNearBottom,
      escapedFromLock,
      contentRef,
      state,
    }),
    [scrollToBottom, isAtBottom, contentRef, escapedFromLock, state]
  );

  useIsomorphicLayoutEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    if (getComputedStyle(scrollRef.current).overflow === 'visible') {
      scrollRef.current.style.overflow = 'auto';
    }
  }, []);

  return (
    <StickToBottomContext.Provider value={context}>
      <div {...props}>{typeof children === 'function' ? children(context) : children}</div>
    </StickToBottomContext.Provider>
  );
}

export namespace StickToBottom {
  export interface ContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    children: ((context: StickToBottomContext) => ReactNode) | ReactNode;
  }

  export function Content({ children, ...props }: ContentProps) {
    const context = useStickToBottomContext();

    return (
      <div
        ref={context.scrollRef}
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <div {...props} ref={context.contentRef}>
          {typeof children === 'function' ? children(context) : children}
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
    throw new Error('use-stick-to-bottom component context must be used within a StickToBottom component');
  }

  return context;
}
