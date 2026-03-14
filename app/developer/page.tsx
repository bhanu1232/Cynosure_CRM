'use client';

import Image from 'next/image';

export default function Developer() {
    const skills = [
        'MongoDB',
        'Express.js',
        'React.js',
        'Node.js',
        'Next.js',
        'TypeScript',
        'JavaScript',
        'HTML5',
        'CSS3',
        'Tailwind CSS',
        'Git',
        'RESTful APIs',
        'Firebase',
        'Redux',
        'Material UI'
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                        {/* Header/Banner Section */}
                        <div className="relative h-56 bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="absolute -bottom-16 left-8">
                                <div className="rounded-2xl border-4 border-white overflow-hidden shadow-lg">
                                    <Image
                                        src="/dev.jpg"
                                        alt="C Bhanu Prakash"
                                        width={128}
                                        height={128}
                                        className="h-32 w-32 object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="px-8 pt-20 pb-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">C Bhanu Prakash</h1>
                                    <p className="text-lg text-blue-600 font-medium mb-4">Full Stack Developer (MERN)</p>
                                </div>
                                <div className="flex space-x-4">
                                    <a
                                        href="https://github.com/bhanuprakash1212"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <span className="sr-only">GitHub</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                        </svg>
                                    </a>
                                    <a
                                        href="https://www.linkedin.com/in/bhanuprakashchowdam"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <span className="sr-only">LinkedIn</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">About Me</h2>
                                    <p className="text-gray-600 leading-relaxed">
                                        Passionate MERN Stack developer with expertise in building modern web applications.
                                        Experienced in creating responsive, user-friendly interfaces and robust backend systems.
                                        Committed to writing clean, maintainable code and staying current with the latest web technologies.
                                    </p>
                                </div>

                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                                    <div className="space-y-3">
                                        <p className="text-gray-600">
                                            <span className="font-medium">Email:</span>{' '}
                                            <a href="mailto:bhanuprakash1212@gmail.com" className="text-blue-600 hover:text-blue-700">
                                                bhanuprakash1212@gmail.com
                                            </a>
                                        </p>
                                        <p className="text-gray-600">
                                            <span className="font-medium">Location:</span> India
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Section */}
                            <div className="mt-12">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Technical Skills</h2>
                                <div className="flex flex-wrap gap-3">
                                    {skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm font-medium"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 