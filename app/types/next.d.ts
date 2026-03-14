declare module 'next/font/google' {
  const Inter: (config: { subsets: string[] }) => {
    className: string;
    style: { fontFamily: string };
  };
  export { Inter };
} 