interface LoaderProps {
  className?: string;
}

export default function Loader({ className = "" }: LoaderProps) {
  return (
    <div className={`flex items-center fixed w-screen h-screen top-0 left-0 bg-black/50 z-50 ${className}`}>
      <div className="spinner mx-auto" />
    </div>
  );
}

