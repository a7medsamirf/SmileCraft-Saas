import React from "react";

// Helper to render star rating
const StarRating = ({ rating }: { rating: number }) => {
  const totalStars = 5;
  return (
    <div className="flex space-x-1 text-yellow-400">
      {[...Array(totalStars)].map((_, index) => (
        <span className="size-4" key={index}>{index < rating ? "★" : "☆"}</span>
      ))}
    </div>
  );
};


export default StarRating;
