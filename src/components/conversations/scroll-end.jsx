"use client";
import { useEffect, useRef } from "react";
/** Sits at the end of a scrollable chat. Keeps the newest message in view, unless the agent scrolled up to read history. */
export function ScrollEnd({ count }) {
    const ref = useRef(null);
    const stick = useRef(true);
    useEffect(() => {
        const box = ref.current?.parentElement;
        if (!box)
            return;
        const onScroll = () => { stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 120; };
        box.addEventListener("scroll", onScroll);
        return () => box.removeEventListener("scroll", onScroll);
    }, []);
    useEffect(() => { const box = ref.current?.parentElement; if (box && stick.current)
        box.scrollTop = box.scrollHeight; }, [count]);
    return <div ref={ref}/>;
}
