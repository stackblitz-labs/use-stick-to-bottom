import { useState, type ReactNode } from 'react';
import { StickToBottom, useStickToBottomContext } from '../src/StickToBottom';
import { useFakeMessages } from './useFakeMessages';



function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return (
    !isAtBottom && (
      <button
        className="fixed i-ph-arrow-circle-down-fill text-4xl rounded-lg left-[50%] translate-x-[-50%] bottom-4"
        onClick={() => scrollToBottom()}
      />
    )
  );
}

function MessagesContent({ messages }: { messages: ReactNode[][] }) {
  const { stopScroll } = useStickToBottomContext();
  return (
    <>
      <div className="relative w-full flex flex-col overflow-hidden">
        <StickToBottom.Content className="flex flex-col gap-4 p-6">
          {[...Array(10)].map((_, i) => (
            <Message key={i}>
              <h1>This is a test</h1>
              more testing text...
            </Message>
          ))}
          {messages.map((message, i) => (
            <Message key={i}>{message}</Message>
          ))}
        </StickToBottom.Content>
        <ScrollToBottom />
      </div>
      <div className="flex justify-center pt-4">
        <button className="rounded bg-slate-600 text-white px-4 py-2" onClick={() => stopScroll()}>
          Stop Scroll
        </button>
      </div>
    </>
  );
}

function Messages({ animation, speed }: { animation: ScrollBehavior; speed: number }) {
  const messages = useFakeMessages(speed);
  return (
    <div className="prose flex flex-col gap-2 w-full overflow-hidden">
      <h2 className="flex justify-center">{animation}:</h2>
      <StickToBottom
        className="h-[50vh] flex flex-col"
        resize={animation}
        initial={animation === 'instant' ? 'instant' : { mass: 10 }}
      >
        <MessagesContent messages={messages} />
      </StickToBottom>
    </div>
  );
}

// Document scroll demo content
function DocumentScrollDemoContent({ speed }: { speed: number }) {
  const messages = useFakeMessages(speed);
  const { stopScroll, contentRef } = useStickToBottomContext();
  return (
    <>
      <div ref={contentRef} className="flex flex-col gap-4 p-6">
        {[...Array(10)].map((_, i) => (
          <Message key={i}>
            <h1>This is a test</h1>
            more testing text...
          </Message>
        ))}
        {messages.map((message, i) => (
          <Message key={i}>{message}</Message>
        ))}
      </div>
      <ScrollToBottom />
      <div className="flex justify-center pt-4">
        <button className="rounded bg-slate-600 text-white px-4 py-2" onClick={() => stopScroll()}>
          Stop Scroll
        </button>
      </div>
    </>
  );
}

export function Demo() {
  const [speed, setSpeed] = useState(0.2);
  const [mode, setMode] = useState<'element' | 'document'>('element');

  return (
    <div className="flex flex-col gap-10 p-10 items-center w-full">
      {/* Header with navigation */}
      <header className="w-full max-w-screen-lg flex justify-center gap-4 text-lg font-bold">
        <button
          className={mode === 'element' ? 'underline text-blue-600' : 'text-blue-600 hover:underline'}
          onClick={() => setMode('element')}
        >
          Element Scroll Demo
        </button>
        <button
          className={mode === 'document' ? 'underline text-blue-600' : 'text-blue-600 hover:underline'}
          onClick={() => setMode('document')}
        >
          Document Scroll Demo
        </button>
      </header>

      {/* Sticky range selector */}
      <div className="sticky top-0 bg-white w-full max-w-screen-lg z-10 py-4">
        <input
          className="w-full"
          type="range"
          value={speed}
          onChange={(e) => setSpeed(+e.target.value)}
          min={0}
          max={1}
          step={0.01}
        />
      </div>

      {/* Conditionally render demos */}
      {mode === 'element' && (
        <div className="flex gap-6 w-full max-w-screen-lg">
          <Messages speed={speed} animation="smooth" />
          <Messages speed={speed} animation="instant" />
        </div>
      )}
      {mode === 'document' && (
        <div className="flex gap-6 w-full max-w-screen-lg">
          <StickToBottom scrollMode="document">
            <DocumentScrollDemoContent speed={speed} />
          </StickToBottom>
        </div>
      )}
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-100 rounded-lg p-4 shadow-md break-words">{children}</div>;
}
