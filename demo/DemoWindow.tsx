import {useEffect, useState} from 'react';
import { useFakeMessages } from './useFakeMessages';
import {useStickToBottom, ScrollToBottom} from "../src";

function ScrollToBottomButton({isAtBottom, scrollToBottom}: {isAtBottom: boolean, scrollToBottom: ScrollToBottom}) {
    return (
        !isAtBottom && (
            <button
                className="fixed i-ph-arrow-circle-down-fill text-4xl rounded-lg left-[50%] translate-x-[-50%]"
                onClick={() => scrollToBottom()}
            />
        )
    );
}

function MessagesContent({ messages }: { messages: React.ReactNode[][] }) {
    const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
        resize: 'smooth',
        initial: 'smooth'
    });

    useEffect(() => {
        scrollRef(window)
    }, [])

    return (
        <>
            <div className="relative w-full flex flex-col">
                <div className="flex flex-col gap-4 p-6" ref={contentRef}>
                    {[...Array(10)].map((_, i) => (
                        <Message key={i}>
                            <h1>This is a test</h1>
                            more testing text...
                        </Message>
                    ))}

                    {messages.map((message, i) => (
                        <Message key={i}>{message}</Message>
                    ))}
                    <ScrollToBottomButton isAtBottom={isAtBottom} scrollToBottom={scrollToBottom}/>
                </div>
            </div>

            <div className="flex justify-center pt-4 sticky bottom-0">
                <button className="rounded bg-slate-600 text-white px-4 py-2" onClick={() => {}}>
                    Stop Scroll
                </button>
            </div>
        </>
    );
}

function Messages({ animation, speed }: { animation: ScrollBehavior; speed: number }) {
    const messages = useFakeMessages(speed);

    return (
        <div className="prose flex flex-col gap-2 w-full">
            <h2 className="flex justify-center">{animation}:</h2>

            <div
                className="h-[50vh] flex flex-col"
            >
                <MessagesContent messages={messages} />
            </div>
        </div>
    );
}

export function DemoWindow() {
    const [speed, setSpeed] = useState(0.2);

    return (
        <div className="flex flex-col gap-10 p-10 items-center w-full">
            <input
                className="w-full max-w-screen-lg"
                type="range"
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
                min={0}
                max={1}
                step={0.01}
            ></input>

            <div className="flex gap-6 w-full">
                <Messages speed={speed} animation="smooth" />
            </div>
        </div>
    );
}

function Message({ children }: { children: React.ReactNode }) {
    return <div className="bg-gray-100 rounded-lg p-4 shadow-md break-words">{children}</div>;
}
