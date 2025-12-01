
import React from 'react';

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-2.281l-9.8-9.8a2.126 2.126 0 00-2.281-.476 2.125 2.125 0 00-1.524 1.524l-.99 3.96c-.17.68.2 1.37.86 1.54 1.05.27 2.18.27 3.23 0 .66-.17 1.03-.86.86-1.54l-.99-3.96a2.125 2.125 0 00-1.524-1.524 2.126 2.126 0 00-2.281.476M2.25 21h19.5"
    />
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 10.5h3m-3 3h3"
    />
  </svg>
);

export default ChatBubbleIcon;
