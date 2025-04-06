import React from 'react';

const WelcomeSection = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 mb-12">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">

        <div className="prose mx-auto max-w-none">

          <h1 className="text-3xl text-center font-bold text-[#406368] mb-2">
            Communication Training
          </h1>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <h3 className="text-xl font-bold text-[#406368] mb-2">
              Why use this app?
            </h3>

            <p>
              People with Parkinson's disease often find it challenging to improve their speech so that other people can
              better understand them. This can make conversations with friends, family, and community members difficult
              and lead to loneliness and depression.
            </p>

            <p>
              We have been able to improve people's ability to understand patients with Parkinson's disease previously through training.
              This study could lead to an alternative approach for improving communication for patients with Parkinson's disease.
            </p>

            <p>
              You are participating in a clinical trial that is testing this approach. In addition to potentially
              improving your own ability to understand your friend or family member, this will provide researchers
              and clinicians with evidence on the effectiveness of this approach for the broader Parkinson's
              disease community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;