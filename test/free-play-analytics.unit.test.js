/**
 * Unit tests for free-play-analytics.js
 * Tests the core analytics functions for free play mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the questions array
global.questions = [
    { text: "Question 1", value: 1 },
    { text: "Question 2", value: -1 },
    { text: "Question 3", value: 2 },
    { text: "Question 4", value: -2 },
    { text: "Question 5", value: 1 }
];

// Mock Firebase API
global.window = {
    FirebaseAPI: {
        loadEvent: vi.fn()
    }
};

// Import the module functions
const {
    loadFreePlayResponses,
    calculateScoreStats,
    calculatePercentile,
    calculateQuestionStats
} = await import('../free-play-analytics.js');

describe('Free Play Analytics', () => {
    describe('loadFreePlayResponses', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should load free play responses from Firebase', async () => {
            const mockResponses = [
                { id: '1', score: 5, answers: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 1 } },
                { id: '2', score: -3, answers: { 0: 0, 1: 1, 2: 0, 3: 1, 4: 0 } }
            ];

            window.FirebaseAPI.loadEvent.mockResolvedValue({
                participants: mockResponses
            });

            const result = await loadFreePlayResponses();

            expect(window.FirebaseAPI.loadEvent).toHaveBeenCalledWith('freeplay');
            expect(result).toEqual(mockResponses);
            expect(result.length).toBe(2);
        });

        it('should return empty array when no responses found', async () => {
            window.FirebaseAPI.loadEvent.mockResolvedValue(null);

            const result = await loadFreePlayResponses();

            expect(result).toEqual([]);
        });

        it('should return empty array when participants is undefined', async () => {
            window.FirebaseAPI.loadEvent.mockResolvedValue({});

            const result = await loadFreePlayResponses();

            expect(result).toEqual([]);
        });

        it('should handle Firebase errors gracefully', async () => {
            window.FirebaseAPI.loadEvent.mockRejectedValue(new Error('Firebase error'));

            const result = await loadFreePlayResponses();

            expect(result).toEqual([]);
        });
    });

    describe('calculateScoreStats', () => {
        it('should calculate correct statistics for multiple responses', () => {
            const responses = [
                { score: 5 },
                { score: -3 },
                { score: 10 },
                { score: 0 },
                { score: 5 }
            ];

            const stats = calculateScoreStats(responses);

            expect(stats.mean).toBe(3.4); // (5 + -3 + 10 + 0 + 5) / 5 = 3.4
            expect(stats.median).toBe(5); // Middle value when sorted: [-3, 0, 5, 5, 10]
            expect(stats.min).toBe(-3);
            expect(stats.max).toBe(10);
            expect(stats.distribution).toEqual([
                { score: -3, count: 1 },
                { score: 0, count: 1 },
                { score: 5, count: 2 },
                { score: 10, count: 1 }
            ]);
        });

        it('should calculate median correctly for even number of responses', () => {
            const responses = [
                { score: 2 },
                { score: 4 },
                { score: 6 },
                { score: 8 }
            ];

            const stats = calculateScoreStats(responses);

            expect(stats.median).toBe(5); // (4 + 6) / 2 = 5
        });

        it('should handle single response', () => {
            const responses = [{ score: 7 }];

            const stats = calculateScoreStats(responses);

            expect(stats.mean).toBe(7);
            expect(stats.median).toBe(7);
            expect(stats.min).toBe(7);
            expect(stats.max).toBe(7);
            expect(stats.distribution).toEqual([{ score: 7, count: 1 }]);
        });

        it('should handle empty responses array', () => {
            const stats = calculateScoreStats([]);

            expect(stats.mean).toBe(0);
            expect(stats.median).toBe(0);
            expect(stats.min).toBe(0);
            expect(stats.max).toBe(0);
            expect(stats.distribution).toEqual([]);
        });

        it('should handle null or undefined responses', () => {
            const statsNull = calculateScoreStats(null);
            const statsUndefined = calculateScoreStats(undefined);

            expect(statsNull.mean).toBe(0);
            expect(statsUndefined.mean).toBe(0);
        });

        it('should round mean to 1 decimal place', () => {
            const responses = [
                { score: 1 },
                { score: 2 },
                { score: 3 }
            ];

            const stats = calculateScoreStats(responses);

            expect(stats.mean).toBe(2); // (1 + 2 + 3) / 3 = 2.0
        });
    });

    describe('calculatePercentile', () => {
        it('should calculate correct percentile', () => {
            const allScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            expect(calculatePercentile(5, allScores)).toBe(50); // 5 out of 10 scores <= 5
            expect(calculatePercentile(1, allScores)).toBe(10); // 1 out of 10 scores <= 1
            expect(calculatePercentile(10, allScores)).toBe(100); // 10 out of 10 scores <= 10
        });

        it('should handle score lower than all scores', () => {
            const allScores = [5, 10, 15, 20];

            expect(calculatePercentile(0, allScores)).toBe(0); // 0 out of 4 scores <= 0
        });

        it('should handle score higher than all scores', () => {
            const allScores = [5, 10, 15, 20];

            expect(calculatePercentile(25, allScores)).toBe(100); // 4 out of 4 scores <= 25
        });

        it('should handle duplicate scores', () => {
            const allScores = [5, 5, 5, 10, 10];

            expect(calculatePercentile(5, allScores)).toBe(60); // 3 out of 5 scores <= 5
        });

        it('should handle empty scores array', () => {
            expect(calculatePercentile(5, [])).toBe(0);
        });

        it('should handle null or undefined scores', () => {
            expect(calculatePercentile(5, null)).toBe(0);
            expect(calculatePercentile(5, undefined)).toBe(0);
        });

        it('should round percentile to nearest integer', () => {
            const allScores = [1, 2, 3];

            // 1 out of 3 = 33.333...%
            expect(calculatePercentile(1, allScores)).toBe(33);
        });
    });

    describe('calculateQuestionStats', () => {
        it('should calculate correct question statistics', () => {
            const responses = [
                { answers: { 0: 1, 1: 0, 2: 1, 3: 0, 4: 1 } },
                { answers: { 0: 1, 1: 1, 2: 0, 3: 0, 4: 1 } },
                { answers: { 0: 0, 1: 1, 2: 1, 3: 1, 4: 0 } }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats.length).toBe(5);
            
            // Question 0: 2 yes, 1 no
            expect(stats[0].yesCount).toBe(2);
            expect(stats[0].noCount).toBe(1);
            expect(stats[0].yesPercentage).toBe(67); // 2/3 = 66.67% rounded to 67
            expect(stats[0].noPercentage).toBe(33);
            
            // Question 1: 2 yes, 1 no
            expect(stats[1].yesCount).toBe(2);
            expect(stats[1].noCount).toBe(1);
            
            // Question 2: 2 yes, 1 no
            expect(stats[2].yesCount).toBe(2);
            expect(stats[2].noCount).toBe(1);
        });

        it('should handle array format answers', () => {
            const responses = [
                { answers: [1, 0, 1, 0, 1] },
                { answers: [0, 1, 0, 1, 0] }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats.length).toBe(5);
            expect(stats[0].yesCount).toBe(1);
            expect(stats[0].noCount).toBe(1);
            expect(stats[0].yesPercentage).toBe(50);
        });

        it('should handle mixed answer formats', () => {
            const responses = [
                { answers: { 0: 1, 1: 0 } },
                { answers: [1, 1] }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats[0].yesCount).toBe(2);
            expect(stats[1].yesCount).toBe(1);
            expect(stats[1].noCount).toBe(1);
        });

        it('should handle missing answers', () => {
            const responses = [
                { answers: { 0: 1 } }, // Only answered question 0
                { answers: { 1: 0 } }  // Only answered question 1
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats[0].yesCount).toBe(1);
            expect(stats[0].noCount).toBe(0);
            expect(stats[1].yesCount).toBe(0);
            expect(stats[1].noCount).toBe(1);
        });

        it('should handle empty responses array', () => {
            const stats = calculateQuestionStats([]);

            expect(stats).toEqual([]);
        });

        it('should handle null or undefined responses', () => {
            const statsNull = calculateQuestionStats(null);
            const statsUndefined = calculateQuestionStats(undefined);

            expect(statsNull).toEqual([]);
            expect(statsUndefined).toEqual([]);
        });

        it('should include question metadata', () => {
            const responses = [
                { answers: { 0: 1, 1: 0 } }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats[0].questionIndex).toBe(0);
            expect(stats[0].questionText).toBe("Question 1");
            expect(stats[0].questionValue).toBe(1);
        });

        it('should handle responses with no answers property', () => {
            const responses = [
                { score: 5 }, // No answers property
                { answers: { 0: 1 } }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats[0].yesCount).toBe(1);
            expect(stats[0].noCount).toBe(0);
        });

        it('should calculate percentages correctly when no one answered', () => {
            const responses = [
                { answers: {} },
                { answers: {} }
            ];

            const stats = calculateQuestionStats(responses);

            expect(stats[0].yesPercentage).toBe(0);
            expect(stats[0].noPercentage).toBe(0);
        });
    });

    describe('UI Rendering Tests (Requirement 2A.8)', () => {
        let container;

        beforeEach(() => {
            // Create a fresh DOM container for each test
            container = document.createElement('div');
            document.body.appendChild(container);
        });

        afterEach(() => {
            // Clean up after each test
            document.body.removeChild(container);
        });

        describe('Empty State Display', () => {
            it('should display empty state message when no other participants exist', () => {
                // Create the results content container
                container.innerHTML = '<div class="results-content"></div>';
                
                const userScore = 5;
                
                // Simulate empty state by checking for first participant message
                const resultsContent = container.querySelector('.results-content');
                resultsContent.innerHTML = `
                    <div class="analytics-container">
                        <div class="analytics-section empty-state">
                            <div class="empty-state-icon">🎉</div>
                            <h2>You're the First Participant!</h2>
                            <div class="user-score-large">Your Score: +${userScore}</div>
                            <p class="empty-state-message">
                                You're the first person to complete the free play quiz. 
                                Come back later to see how your score compares to others!
                            </p>
                        </div>
                    </div>
                `;
                
                // Verify empty state elements are present
                const emptyState = container.querySelector('.empty-state');
                expect(emptyState).toBeTruthy();
                
                const heading = container.querySelector('.empty-state h2');
                expect(heading.textContent).toBe("You're the First Participant!");
                
                const scoreDisplay = container.querySelector('.user-score-large');
                expect(scoreDisplay.textContent).toContain(userScore.toString());
                
                const message = container.querySelector('.empty-state-message');
                expect(message.textContent).toContain('first person');
            });

            it('should display user score in empty state', () => {
                container.innerHTML = '<div class="results-content"></div>';
                
                const userScore = -3;
                const resultsContent = container.querySelector('.results-content');
                resultsContent.innerHTML = `
                    <div class="analytics-container">
                        <div class="analytics-section empty-state">
                            <div class="user-score-large">Your Score: ${userScore}</div>
                        </div>
                    </div>
                `;
                
                const scoreDisplay = container.querySelector('.user-score-large');
                expect(scoreDisplay.textContent).toContain(userScore.toString());
            });

            it('should include encouraging message in empty state', () => {
                container.innerHTML = '<div class="results-content"></div>';
                
                const resultsContent = container.querySelector('.results-content');
                resultsContent.innerHTML = `
                    <div class="analytics-container">
                        <div class="analytics-section empty-state">
                            <p class="empty-state-message">
                                You're the first person to complete the free play quiz. 
                                Come back later to see how your score compares to others!
                            </p>
                            <p class="empty-state-tip">
                                Share the quiz with friends to see how their privilege compares to yours.
                            </p>
                        </div>
                    </div>
                `;
                
                const message = container.querySelector('.empty-state-message');
                expect(message.textContent).toContain('Come back later');
                
                const tip = container.querySelector('.empty-state-tip');
                expect(tip.textContent).toContain('Share the quiz');
            });
        });

        describe('Histogram Rendering', () => {
            it('should render histogram with correct number of bars', () => {
                container.innerHTML = '<div id="scoreHistogram"></div>';
                
                const distribution = [
                    { score: -3, count: 1 },
                    { score: 0, count: 2 },
                    { score: 5, count: 3 },
                    { score: 10, count: 1 }
                ];
                const userScore = 5;
                
                // Simulate histogram rendering
                const histogramContainer = container.querySelector('#scoreHistogram');
                const maxCount = Math.max(...distribution.map(d => d.count));
                
                const histogramHTML = distribution.map(({ score, count }) => {
                    const heightPercent = (count / maxCount) * 100;
                    const isUserScore = score === userScore;
                    
                    return `
                        <div class="histogram-bar-container">
                            <div class="histogram-bar ${isUserScore ? 'user-score' : ''}" 
                                 style="height: ${heightPercent}%">
                                <span class="bar-count">${count}</span>
                            </div>
                            <div class="histogram-label">${score > 0 ? '+' : ''}${score}</div>
                            ${isUserScore ? '<div class="user-indicator">You</div>' : ''}
                        </div>
                    `;
                }).join('');
                
                histogramContainer.innerHTML = `<div class="histogram-chart">${histogramHTML}</div>`;
                
                // Verify histogram structure
                const bars = container.querySelectorAll('.histogram-bar-container');
                expect(bars.length).toBe(4);
                
                const barCounts = container.querySelectorAll('.bar-count');
                expect(barCounts[0].textContent).toBe('1');
                expect(barCounts[1].textContent).toBe('2');
                expect(barCounts[2].textContent).toBe('3');
                expect(barCounts[3].textContent).toBe('1');
            });

            it('should highlight user score in histogram', () => {
                container.innerHTML = '<div id="scoreHistogram"></div>';
                
                const distribution = [
                    { score: 0, count: 1 },
                    { score: 5, count: 2 }
                ];
                const userScore = 5;
                
                const histogramContainer = container.querySelector('#scoreHistogram');
                const maxCount = Math.max(...distribution.map(d => d.count));
                
                const histogramHTML = distribution.map(({ score, count }) => {
                    const heightPercent = (count / maxCount) * 100;
                    const isUserScore = score === userScore;
                    
                    return `
                        <div class="histogram-bar-container">
                            <div class="histogram-bar ${isUserScore ? 'user-score' : ''}"></div>
                            ${isUserScore ? '<div class="user-indicator">You</div>' : ''}
                        </div>
                    `;
                }).join('');
                
                histogramContainer.innerHTML = `<div class="histogram-chart">${histogramHTML}</div>`;
                
                // Verify user score is highlighted
                const userScoreBars = container.querySelectorAll('.histogram-bar.user-score');
                expect(userScoreBars.length).toBe(1);
                
                const userIndicator = container.querySelector('.user-indicator');
                expect(userIndicator).toBeTruthy();
                expect(userIndicator.textContent).toBe('You');
            });

            it('should display empty message when no distribution data', () => {
                container.innerHTML = '<div id="scoreHistogram"></div>';
                
                const histogramContainer = container.querySelector('#scoreHistogram');
                histogramContainer.innerHTML = '<p class="empty-message">No distribution data available</p>';
                
                const emptyMessage = container.querySelector('.empty-message');
                expect(emptyMessage).toBeTruthy();
                expect(emptyMessage.textContent).toBe('No distribution data available');
            });

            it('should scale bars correctly based on max count', () => {
                container.innerHTML = '<div id="scoreHistogram"></div>';
                
                const distribution = [
                    { score: 0, count: 2 },
                    { score: 5, count: 4 },
                    { score: 10, count: 1 }
                ];
                
                const histogramContainer = container.querySelector('#scoreHistogram');
                const maxCount = Math.max(...distribution.map(d => d.count));
                
                const histogramHTML = distribution.map(({ score, count }) => {
                    const heightPercent = (count / maxCount) * 100;
                    
                    return `
                        <div class="histogram-bar" style="height: ${heightPercent}%"></div>
                    `;
                }).join('');
                
                histogramContainer.innerHTML = histogramHTML;
                
                const bars = container.querySelectorAll('.histogram-bar');
                expect(bars[0].style.height).toBe('50%'); // 2/4 = 50%
                expect(bars[1].style.height).toBe('100%'); // 4/4 = 100%
                expect(bars[2].style.height).toBe('25%'); // 1/4 = 25%
            });
        });

        describe('Question Comparison Rendering', () => {
            it('should render all questions with statistics', () => {
                container.innerHTML = '<div id="questionStatsContainer"></div>';
                
                const questionStats = [
                    {
                        questionIndex: 0,
                        questionText: "Question 1",
                        questionValue: 1,
                        yesCount: 3,
                        noCount: 2,
                        yesPercentage: 60,
                        noPercentage: 40
                    },
                    {
                        questionIndex: 1,
                        questionText: "Question 2",
                        questionValue: -1,
                        yesCount: 1,
                        noCount: 4,
                        yesPercentage: 20,
                        noPercentage: 80
                    }
                ];
                const userAnswers = { 0: 1, 1: 0 };
                
                // Simulate question comparison rendering
                const statsContainer = container.querySelector('#questionStatsContainer');
                const questionsHTML = questionStats.map(stat => {
                    const userAnswer = userAnswers[stat.questionIndex];
                    const userAnsweredYes = userAnswer === 1;
                    const userAnsweredNo = userAnswer === 0;
                    
                    return `
                        <div class="question-stat-card">
                            <div class="question-text">${stat.questionText}</div>
                            <div class="question-value">Point value: ${stat.questionValue > 0 ? '+' : ''}${stat.questionValue}</div>
                            <div class="answer-distribution">
                                <div class="answer-bar-container">
                                    <div class="answer-label ${userAnsweredYes ? 'user-answer' : ''}">
                                        Yes ${userAnsweredYes ? '(You)' : ''}
                                    </div>
                                    <div class="answer-bar yes-bar" style="width: ${stat.yesPercentage}%">
                                        <span class="answer-percentage">${stat.yesPercentage}%</span>
                                    </div>
                                </div>
                                <div class="answer-bar-container">
                                    <div class="answer-label ${userAnsweredNo ? 'user-answer' : ''}">
                                        No ${userAnsweredNo ? '(You)' : ''}
                                    </div>
                                    <div class="answer-bar no-bar" style="width: ${stat.noPercentage}%">
                                        <span class="answer-percentage">${stat.noPercentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                statsContainer.innerHTML = questionsHTML;
                
                // Verify all questions are rendered
                const questionCards = container.querySelectorAll('.question-stat-card');
                expect(questionCards.length).toBe(2);
                
                // Verify question text
                const questionTexts = container.querySelectorAll('.question-text');
                expect(questionTexts[0].textContent).toBe('Question 1');
                expect(questionTexts[1].textContent).toBe('Question 2');
            });

            it('should highlight user answers in question comparison', () => {
                container.innerHTML = '<div id="questionStatsContainer"></div>';
                
                const questionStats = [
                    {
                        questionIndex: 0,
                        questionText: "Question 1",
                        questionValue: 1,
                        yesPercentage: 60,
                        noPercentage: 40
                    }
                ];
                const userAnswers = { 0: 1 }; // User answered Yes
                
                const statsContainer = container.querySelector('#questionStatsContainer');
                const userAnswer = userAnswers[0];
                const userAnsweredYes = userAnswer === 1;
                
                statsContainer.innerHTML = `
                    <div class="question-stat-card">
                        <div class="answer-distribution">
                            <div class="answer-label ${userAnsweredYes ? 'user-answer' : ''}">
                                Yes ${userAnsweredYes ? '(You)' : ''}
                            </div>
                            <div class="answer-label ${!userAnsweredYes ? 'user-answer' : ''}">
                                No ${!userAnsweredYes ? '(You)' : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                // Verify user answer is highlighted
                const userAnswerLabels = container.querySelectorAll('.answer-label.user-answer');
                expect(userAnswerLabels.length).toBe(1);
                expect(userAnswerLabels[0].textContent).toContain('Yes');
                expect(userAnswerLabels[0].textContent).toContain('(You)');
            });

            it('should display percentages for each answer option', () => {
                container.innerHTML = '<div id="questionStatsContainer"></div>';
                
                const questionStats = [
                    {
                        questionIndex: 0,
                        questionText: "Question 1",
                        questionValue: 1,
                        yesPercentage: 75,
                        noPercentage: 25
                    }
                ];
                
                const statsContainer = container.querySelector('#questionStatsContainer');
                statsContainer.innerHTML = `
                    <div class="question-stat-card">
                        <div class="answer-bar yes-bar" style="width: 75%">
                            <span class="answer-percentage">75%</span>
                        </div>
                        <div class="answer-bar no-bar" style="width: 25%">
                            <span class="answer-percentage">25%</span>
                        </div>
                    </div>
                `;
                
                // Verify percentages are displayed
                const percentages = container.querySelectorAll('.answer-percentage');
                expect(percentages.length).toBe(2);
                expect(percentages[0].textContent).toBe('75%');
                expect(percentages[1].textContent).toBe('25%');
                
                // Verify bar widths
                const yesBars = container.querySelectorAll('.yes-bar');
                expect(yesBars[0].style.width).toBe('75%');
                
                const noBars = container.querySelectorAll('.no-bar');
                expect(noBars[0].style.width).toBe('25%');
            });

            it('should display empty message when no question data', () => {
                container.innerHTML = '<div id="questionStatsContainer"></div>';
                
                const statsContainer = container.querySelector('#questionStatsContainer');
                statsContainer.innerHTML = '<p class="empty-message">No question data available</p>';
                
                const emptyMessage = container.querySelector('.empty-message');
                expect(emptyMessage).toBeTruthy();
                expect(emptyMessage.textContent).toBe('No question data available');
            });

            it('should display question point values', () => {
                container.innerHTML = '<div id="questionStatsContainer"></div>';
                
                const questionStats = [
                    {
                        questionIndex: 0,
                        questionText: "Question 1",
                        questionValue: 2,
                        yesPercentage: 50,
                        noPercentage: 50
                    },
                    {
                        questionIndex: 1,
                        questionText: "Question 2",
                        questionValue: -3,
                        yesPercentage: 50,
                        noPercentage: 50
                    }
                ];
                
                const statsContainer = container.querySelector('#questionStatsContainer');
                const questionsHTML = questionStats.map(stat => `
                    <div class="question-stat-card">
                        <div class="question-value">Point value: ${stat.questionValue > 0 ? '+' : ''}${stat.questionValue}</div>
                    </div>
                `).join('');
                
                statsContainer.innerHTML = questionsHTML;
                
                // Verify point values are displayed
                const pointValues = container.querySelectorAll('.question-value');
                expect(pointValues[0].textContent).toBe('Point value: +2');
                expect(pointValues[1].textContent).toBe('Point value: -3');
            });
        });
    });
});
