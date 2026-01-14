import React from 'react'

const Spinner = () => {
    return (
        <div className="flex justify-center items-center p-10 gap-4">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-center py-6 text-gray-500">Loading employees...</p>
        </div>
    )
}

export default Spinner