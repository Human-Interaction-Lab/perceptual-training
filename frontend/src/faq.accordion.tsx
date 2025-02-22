import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
import { Headphones } from "lucide-react";

const TrainingFAQ = () => {
  const faqItems = [
    {
      question: "What do I do if I experience a technical issue?",
      answer: "If at any time during this training program you experience technical issues, please call or email the team. Contact: 614-570-8258 or speechtrainingresearch@gmail.com"
    },
    {
      question: "What are the requirements of the training program?",
      answer: (
        <div className="flex items-center space-x-2">
          <span>You must have access to a computer connected to the internet. Please wear</span>
          <strong>headphones</strong>
          <Headphones className="h-4 w-4" />
          <span>during all portions of this training program.</span>
        </div>
      )
    },
    {
      question: "What happens on the different days of the training program?",
      answer: "You will complete a demographic questionnaire and pretest on the first day of the study. This will consist of an intelligibility task, a listening effort task, and a comprehension task. For the next four days, you will complete the training program which consists of listening to a recording of your friend or family member with written captions as well as an intelligibility task. One week after training, you will complete a posttest. One month after training, you will complete a second posttest. Each posttest will have the same components as the pretest. You will receive email reminders for each day of the study."
    },
    {
      question: "What if I miss a day of training?",
      answer: "Please contact the study team at 614-570-8258 or speechtrainingresearch@gmail.com as soon as possible and we can adjust your program to continue on the following day."
    },
    {
      question: "How long will each portion take?",
      answer: "The pretest and posttests are estimated to take approximately XX minutes. Each of the four training days is estimated to take approximately 30 minutes."
    },
    {
      question: "Is there a specific time of day I need to complete the training?",
      answer: "No, you may complete the training at any time of day, and training can occur at different times of day across the four days of training. Please complete the training at a time of day when you have at least 30 minutes to dedicate to the task."
    },
    {
      question: "What if I forget my username and password for the training program?",
      answer: "Your username and password were e-mailed to you after you were first enrolled in the study. If you need this information e-mailed to you again, please send a message to speechtrainingresearch@gmail.com."
    },
    {
      question: "What if I want to withdraw from the study?",
      answer: "You may withdraw from the study at any time without penalty. Please contact us at speechtrainingresearch@gmail.com to withdraw."
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Training Program Q&A</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default TrainingFAQ;