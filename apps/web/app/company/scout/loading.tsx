"use client"

export default function ScoutLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        className="animate-spin h-8 w-8 text-indigo-600"
        xmlns="https://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="読み込み中"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>
  )
}