import React from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

export const COMPREHENSION_DATA = {
    "Comp_01": {
        name: "Story 1: Baseball Game",
        questions: [
            {
                id: "Comp_01_01",
                question: "The game was played about:",
                options: ["2:00", "12:00", "7:00", "4:00", "9:00"],
                answer: "C"
            },
            {
                id: "Comp_01_02",
                question: "When George got to his seat, he:",
                options: ["Bought a hot dog", "Pretented to play baseball", "Put on a baseball cap", "Wanted a better seat", "Put film in his camera"],
                answer: "B"
            },
            {
                id: "Comp_01_03",
                question: "George told everyone around him that:",
                options: ["He planned to catch a home run ball", "He was a sports announcer", "His son was a famous baseball star", "He deserved a better seat", "He had played baseball in high school"],
                answer: "E"
            },
            {
                id: "Comp_01_04",
                question: "The batter:",
                options: ["Struck out", "Hit a ground ball", "Hit a foul ball", "Hit a home run", "Walked"],
                answer: "C"
            },
            {
                id: "Comp_01_05",
                question: "During the game, George:",
                options: ["Missed the ball", "Caught the ball", "Pretended to catch the ball", "Got hit by the ball", "Threw the ball back"],
                answer: "A"
            },
            {
                id: "Comp_01_06",
                question: "George tried to catch the baseball:",
                options: ["At the beginning of the game", "In the middle of the game", "Before the game", "At the end of the game", "After the game"],
                answer: "B"
            },
            {
                id: "Comp_01_07",
                question: "The ball was found by:",
                options: ["Hotdog vendor", "George", "A security guard", "A bat boy", "A recruiter"],
                answer: "E"
            },
            {
                id: "Comp_01_08",
                question: "George was approached by a:",
                options: ["Baseball scout", "Doctor", "Baseball player", "Man with the circus", "Hotdog vendor"],
                answer: "D"
            },
            {
                id: "Comp_01_09",
                question: "The man gave George:",
                options: ["A business card", "An autographed baseball", "A ride to the hospital", "Help getting up", "A hotdog"],
                answer: "A"
            },
            {
                id: "Comp_01_10",
                question: "George wanted the man to:",
                options: ["Bring him a hotdog", "Sign his baseball", "Help him back to his seat", "Recruit him for a team", "Take him to the hospital"],
                answer: "D"
            }
        ]
    },
    "Comp_02": {
        name: "Story 2: Paint Salesman",
        questions: [
            {
                id: "Comp_02_01",
                question: "Jim was:",
                options: ["A mailman", "An insurance salesman", "A paint salesman", "A repairman", "A real estate agent"],
                answer: "C"
            },
            {
                id: "Comp_02_02",
                question: "Jim was driving:",
                options: ["On an interstate", "Through the city", "Near his home", "Through the suburbs", "Through the country"],
                answer: "E"
            },
            {
                id: "Comp_02_03",
                question: "It was a:",
                options: ["Cold, cloudy day", "Hot, sunny day", "Cold, rainy night", "Warm, rainy night", "Cool, sunny evening"],
                answer: "B"
            },
            {
                id: "Comp_02_04",
                question: "While waiting, Jim:",
                options: ["Listened to the radio", "Took a nap", "Ate a snack", "Sat down under a tree", "Checked the oil"],
                answer: "D"
            },
            {
                id: "Comp_02_05",
                question: "Jim's car stopped running:",
                options: ["On his way home at night", "After he had made many stops", "Early in the day", "On his way to lunch", "During a bad rainstorm"],
                answer: "C"
            },
            {
                id: "Comp_02_06",
                question: "Jim decided to:",
                options: ["Cancel an appointment", "Walk to get help", "Call a tow truck", "Get a ride to town", "Call his boss"],
                answer: "B"
            },
            {
                id: "Comp_02_07",
                question: "The car Jim was driving was:",
                options: ["Fairly new", "Rented", "Rarely driven", "Just repaired", "Very old"],
                answer: "A"
            },
            {
                id: "Comp_02_08",
                question: "Jim's car:",
                options: ["Had a dead battery", "Was leaking oil", "Had a bad transmission", "Was out of gas", "Was overheated"],
                answer: "D"
            },
            {
                id: "Comp_02_09",
                question: "While walking, Jim stopped to:",
                options: ["Use a pay phone", "Fill the gas can", "Flag down a passing car", "Ask a young lady for help", "Talk to an old man"],
                answer: "E"
            },
            {
                id: "Comp_02_10",
                question: "The gas station:",
                options: ["Over two miles", "About a mile", "Just around the bend", "Closed that day", "Out of gas"],
                answer: "A"
            }
        ]
    },
    "Comp_03": {
        name: "Story 3: Library Visit",
        questions: [
            {
                id: "Comp_03_01",
                question: "Henry went to the:",
                options: ["Bank", "Hospital", "Bookstore", "Library", "Airport"],
                answer: "D"
            },
            {
                id: "Comp_03_02",
                question: "On that day, it was:",
                options: ["Raining", "Hot", "Snowing", "Windy", "Pleasant"],
                answer: "A"
            },
            {
                id: "Comp_03_03",
                question: "The woman Henry spoke to:",
                options: ["Had long hair", "Wore glasses", "Had gray hair", "Wore a skirt", "Wore a skirt"],
                answer: "C"
            },
            {
                id: "Comp_03_04",
                question: "When Henry approached the woman, she was:",
                options: ["Talking on the phone", "Helping a customer", "Reading a book", "Shelving books", "Sorting papers"],
                answer: "E"
            },
            {
                id: "Comp_03_05",
                question: "Henry had trouble:",
                options: ["Remembering", "Talking", "Concentrating", "Seeing", "Learning"],
                answer: "A"
            },
            {
                id: "Comp_03_06",
                question: "The woman was:",
                options: ["Pleased", "Disappointed", "Irritated", "Furious", "Relieved"],
                answer: "C"
            },
            {
                id: "Comp_03_07",
                question: "The woman:",
                options: ["Asked Henry to leave", "Filled out a report", "Took back the book", "Called the supervisor", "Took away Henry's priviledges"],
                answer: "B"
            },
            {
                id: "Comp_03_08",
                question: "The book was:",
                options: ["Replaced", "Returned", "Damaged", "Lost", "Found"],
                answer: "D"
            },
            {
                id: "Comp_03_09",
                question: "Henry had been:",
                options: ["Away at school", "On a business trip", "On a cruise", "At home", "On vacation"],
                answer: "E"
            },
            {
                id: "Comp_03_10",
                question: "Henry left the book in:",
                options: ["Florida", "Mexico", "California", "Bermuda", "Puerto Rico"],
                answer: "B"
            }
        ]
    },
    "Comp_04": {
        name: "Story 4: Student Loan",
        questions: [
            {
                id: "Comp_04_01",
                question: "Neil asked his parents to:",
                options: ["Lend him their car", "Give him some money", "Sign some forms", "Take him out to eat", "Give him some advice"],
                answer: "A"
            },
            {
                id: "Comp_04_02",
                question: "Neil wanted to:",
                options: ["Pay off his loan", "Join the army", "Get married", "Stay in school", "Start a business"],
                answer: "D"
            },
            {
                id: "Comp_04_03",
                question: "Neil needed money:",
                options: ["To repay student loans", "For tuition", "For rent", "To buy a ring", "For a computer"],
                answer: "B"
            },
            {
                id: "Comp_04_04",
                question: "In an attempt to get money, Neil:",
                options: ["Sold his car", "Got a job", "Went to the bank", "Asked his parents", "Applied for a scholarship"],
                answer: "C"
            },
            {
                id: "Comp_04_05",
                question: "Neil went to the bank:",
                options: ["With his fiancé", "In the morning", "In the afternoon", "At lunchtime", "With his parents"],
                answer: "C"
            },
            {
                id: "Comp_04_06",
                question: "The woman asked Neil:",
                options: ["About his monthly expenses", "About his martial status", "For his parents' signatures", "To fill out a form", "About his grades"],
                answer: "E"
            },
            {
                id: "Comp_04_07",
                question: "Neil was:",
                options: ["Determined", "Optimistic", "Impatient", "Lazy", "Nervous"],
                answer: "E"
            },
            {
                id: "Comp_04_08",
                question: "Neil said he ate a:",
                options: ["Pickle sandwich", "Macaroni sandwich", "Mayonnaise sandwich", "Lettuce sandwich", "Cheese sandwich"],
                answer: "B"
            },
            {
                id: "Comp_04_09",
                question: "The woman throught Neil's lunch was:",
                options: ["Tasty", "Expensive", "Healthy", "Not enough", "Strange"],
                answer: "E"
            },
            {
                id: "Comp_04_10",
                question: "The woman:",
                options: ["Offered to cook for Neil", "Asked Neil to leave", "Turned Neil down", "Changed her mind", "Called Neil's parents"],
                answer: "D"
            }
        ]
    },
    "Comp_05": {
        name: "Story 5: House Painters",
        questions: [
            {
                id: "Comp_05_01",
                question: "Fred and Ben had a business in:",
                options: ["Gardening", "Siding", "Carpentry", "Painting", "Roofing"],
                answer: "D"
            },
            {
                id: "Comp_05_02",
                question: "Fred and Ben were:",
                options: ["Neighbors", "Brothers", "Friends", "Cousins", "Father and son"],
                answer: "D"
            },
            {
                id: "Comp_05_03",
                question: "Mrs. Foster called the men on:",
                options: ["Saturday", "Sunday", "Wednesday", "Thursday", "Monday"],
                answer: "E"
            },
            {
                id: "Comp_05_04",
                question: "Mrs. Foster found out about the painters from:",
                options: ["The local hardware store", "The newspaper", "Signs", "Friends", "Yellow pages"],
                answer: "B"
            },
            {
                id: "Comp_05_05",
                question: "Mrs. Foster was their:",
                options: ["100th customer", "Best customer", "1st customer", "500th customer", "Least favorite customer"],
                answer: "C"
            },
            {
                id: "Comp_05_06",
                question: "Fred and Ben were painting a:",
                options: ["Two-story house", "Garage", "Fence", "One-story house", "Barn"],
                answer: "A"
            },
            {
                id: "Comp_05_07",
                question: "Mrs. Foster asked Fred and Ben to:",
                options: ["Paint her house on Saturday", "Help choose a paint color", "Give her a discount", "Meet with her by Tuesday", "Paint her house quickly"],
                answer: "E"
            },
            {
                id: "Comp_05_08",
                question: "Mrs. Foster needed the house painted for:",
                options: ["Her daughter's wedding", "Her 50th anniversary party", "An open house", "Her husband's birthday", "Her 25th anniversary party"],
                answer: "A"
            },
            {
                id: "Comp_05_09",
                question: "The man came around the house at about:",
                options: ["5 p.m.", "3 p.m.", "1 p.m.", "2 p.m.", "4 p.m."],
                answer: "B"
            },
            {
                id: "Comp_05_10",
                question: "Fred and Ben:",
                options: ["Ran out of paint", "Used the wrong color of paint", "Painted the house too late", "Painted the wrong house", "Painted the windows shut"],
                answer: "D"
            }
        ]
    },
    "Comp_06": {
        name: "Story 6: Restaurant Visit",
        questions: [
            {
                id: "Comp_06_01",
                question: "Sam traveled by:",
                options: ["Bicycle", "Subway", "Bus", "Car", "Motorcycle"],
                answer: "C"
            },
            {
                id: "Comp_06_02",
                question: "The story took place:",
                options: ["In a mall", "Downtown", "At a high school", "In the summer", "In the fall"],
                answer: "B"
            },
            {
                id: "Comp_06_03",
                question: "After running his errands, Sam went to:",
                options: ["Eat lunch", "Meet with students", "A bus stop", "His office", "Meet his wife"],
                answer: "A"
            },
            {
                id: "Comp_06_04",
                question: "Sam was:",
                options: ["Recently married", "Young", "Divorced", "Middle-aged", "Old"],
                answer: "E"
            },
            {
                id: "Comp_06_05",
                question: "Sam wanted to eat at a restaurant that was:",
                options: ["Quiet", "Cheap", "Quick", "Nearby", "Familiar"],
                answer: "A"
            },
            {
                id: "Comp_06_06",
                question: "Sam went into a restaurant that:",
                options: ["Was crowded with teenagers", "Had a sign in the window", "Was close to his office", "He ate at regularly", "Had a senior discount"],
                answer: "B"
            },
            {
                id: "Comp_06_07",
                question: "Sam ordered a:",
                options: ["Grilled cheese sandwich", "Goat sandwich", "Rabbit sandwich", "Buffalo sandwich", "Turkey sandwich"],
                answer: "B"
            },
            {
                id: "Comp_06_08",
                question: "When Sam placed his order, the waitress:",
                options: ["Suggested something else", "Was shocked by it", "Put it in right away", "Wrote it down wrong", "Asked the cook about it"],
                answer: "E"
            },
            {
                id: "Comp_06_09",
                question: "Sam tried to order a sandwich that would:",
                options: ["Taste good", "Arrive very quickly", "Prove the sign wrong", "Be healthy", "Be inexpensive"],
                answer: "C"
            },
            {
                id: "Comp_06_10",
                question: "The price of the sandwich was:",
                options: ["$1.49", "$0.99", "$2.99", "$1.99", "$2.09"],
                answer: "D"
            }
        ]
    }
};

const ComprehensionTest = ({
    question,
    options,
    userResponse,
    onResponseChange,
    onSubmit,
    currentStimulus,
    totalStimuli,
    onPlayAudio,
    storyId
}) => {
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="space-y-6">
            {/* Progress and Story ID */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Progress: {currentStimulus + 1} of {totalStimuli}</span>
                <span className="text-blue-600 font-medium">Story {storyId}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStimulus + 1) / totalStimuli) * 100}%` }}
                />
            </div>

            {/* Audio Control */}
            <Button
                onClick={onPlayAudio}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-4"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Play Story Audio</span>
            </Button>

            {/* Question */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <Label className="block text-lg font-medium mb-4">
                    {question}
                </Label>

                {/* Options */}
                <div className="grid gap-3">
                    {options.map((option, index) => (
                        <Card
                            key={index}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 ${userResponse === index
                                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                                : 'hover:bg-gray-50'
                                }`}
                            onClick={() => onResponseChange(index)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full border ${userResponse === index
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-gray-300'
                                    }`}>
                                    {optionLabels[index]}
                                </div>
                                <span className="text-gray-700">{option}</span>
                            </div>
                        </Card>
                    ))}
                </div>

                <Button
                    onClick={onSubmit}
                    className="w-full mt-6"
                    disabled={userResponse === null}
                >
                    Submit Response
                </Button>
            </div>
        </div>
    );
};

export default ComprehensionTest;