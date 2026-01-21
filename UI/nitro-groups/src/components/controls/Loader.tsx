interface LoaderProps {
  className?: string;
}

export default function Loader({ className = "" }: LoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="loader-logo">
        <svg
          className="w-[150px] h-auto"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="40" className="text-primary" />
        </svg>
      </div>
    </div>
  );
}
