import React from 'react'

const LoadingSpinner: React.FC = () => {
    return (
        <div className='loading'>
            <div className='spinner'></div>
            <p>Loading...</p>
        </div>
    );
};

export default LoadingSpinner;