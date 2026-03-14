import React from "react";
import { SwimmerData } from "../../types";

interface SwimmerComparisonProps {
    swimmers: SwimmerData[];
    onClose: () => void;
}

const SwimmerComparison: React.FC<SwimmerComparisonProps> = ({
    swimmers,
    onClose
}) => {    
    return (
        <section className="comparison-section-card">            
            
        </section>
    );
};

export default SwimmerComparison;