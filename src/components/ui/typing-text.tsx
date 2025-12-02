'use client';

import { useState, useEffect } from 'react';

export const TypingText = ({ messages, className }: { messages: string[], className?: string }) => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const i = loopNum % messages.length;
    const fullText = messages[i];

    const handleType = () => {
      setText(isDeleting 
        ? fullText.substring(0, text.length - 1) 
        : fullText.substring(0, text.length + 1)
      );

      setTypingSpeed(isDeleting ? 30 : 100);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, messages, typingSpeed]);

  return (
    <span className={`inline-flex items-center min-h-[20px] ${className}`}>
      {text}
      <span className="ml-1 w-0.5 h-4 bg-orange-500 animate-pulse"/>
    </span>
  );
};
