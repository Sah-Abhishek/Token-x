import React from 'react';
import Image from 'next/image';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Alex Thompson',
    role: 'Crypto Enthusiast',
    quote: '"Best trading practice platform! Perfect for learning without risks."',
    avatar: '/avatar1.png', // Add placeholder images to your public folder
  },
  {
    name: 'Sarah Chen',
    role: 'Day Trader',
    quote: '"Helped me understand market movements and improve my strategy."',
    avatar: '/avatar2.png',
  },
  {
    name: 'Mike Rodriguez',
    role: 'Beginner Trader',
    quote: '"The leaderboard keeps me motivated to improve my trading skills!"',
    avatar: '/avatar3.png',
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-12 px-6 bg-white">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12">What Traders Say</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {/* Fallback avatar representation */}
                  <span className="text-xl">{testimonial.name.charAt(0)}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{testimonial.name}</h3>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-700">{testimonial.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
