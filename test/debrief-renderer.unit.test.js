/**
 * Unit tests for Debrief Renderer Module
 * 
 * Tests the renderScoreMeaning function for correct HTML output.
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, test, expect } from 'vitest';
import { renderScoreMeaning, renderResponseAnalysis } from '../debrief-renderer.js';

describe('Debrief Renderer Module', () => {
    describe('renderScoreMeaning', () => {
        test('should return HTML with .debrief-section.score-meaning container', () => {
            const debrief = { title: 'Test Title', message: 'Test message', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('class="debrief-section score-meaning"');
        });

        test('should include h2 heading "Understanding Your Score"', () => {
            const debrief = { title: 'Test Title', message: 'Test message', category: 'neutral' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h2>Understanding Your Score</h2>');
        });

        test('should include category-specific title as h3', () => {
            const debrief = { title: 'Your Journey and Resilience', message: 'Some message', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3>Your Journey and Resilience</h3>');
        });

        test('should include message as paragraph', () => {
            const debrief = { title: 'Title', message: 'This is the debrief message content.', category: 'high' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<p>This is the debrief message content.</p>');
        });

        test('should render low privilege debrief correctly', () => {
            const debrief = {
                title: 'Your Journey and Resilience',
                message: 'Your score reflects a starting context with more challenges.',
                category: 'low'
            };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3>Your Journey and Resilience</h3>');
            expect(html).toContain('<p>Your score reflects a starting context with more challenges.</p>');
        });

        test('should render neutral privilege debrief correctly', () => {
            const debrief = {
                title: 'Understanding Your Mixed Experience',
                message: 'Your score reflects a mix of advantages and challenges.',
                category: 'neutral'
            };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3>Understanding Your Mixed Experience</h3>');
            expect(html).toContain('<p>Your score reflects a mix of advantages and challenges.</p>');
        });

        test('should render high privilege debrief correctly', () => {
            const debrief = {
                title: 'Using Your Advantages to Help Others',
                message: 'Your advantages are like superpowers.',
                category: 'high'
            };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3>Using Your Advantages to Help Others</h3>');
            expect(html).toContain('<p>Your advantages are like superpowers.</p>');
        });

        test('should include debrief-content wrapper div', () => {
            const debrief = { title: 'Title', message: 'Message', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('class="debrief-content"');
        });

        test('should handle empty title gracefully', () => {
            const debrief = { title: '', message: 'Some message', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3></h3>');
            expect(html).toContain('<p>Some message</p>');
        });

        test('should handle empty message gracefully', () => {
            const debrief = { title: 'Title', message: '', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3>Title</h3>');
            expect(html).toContain('<p></p>');
        });

        test('should handle missing title property', () => {
            const debrief = { message: 'Some message', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<h3></h3>');
        });

        test('should handle missing message property', () => {
            const debrief = { title: 'Title', category: 'low' };
            const html = renderScoreMeaning(debrief);

            expect(html).toContain('<p></p>');
        });

        test('should maintain correct HTML nesting structure', () => {
            const debrief = { title: 'Title', message: 'Message', category: 'neutral' };
            const html = renderScoreMeaning(debrief);

            // Verify the outer div contains the h2 and debrief-content div
            const outerDivStart = html.indexOf('class="debrief-section score-meaning"');
            const h2Pos = html.indexOf('<h2>');
            const contentDivPos = html.indexOf('class="debrief-content"');
            const h3Pos = html.indexOf('<h3>');
            const pPos = html.indexOf('<p>');

            expect(outerDivStart).toBeLessThan(h2Pos);
            expect(h2Pos).toBeLessThan(contentDivPos);
            expect(contentDivPos).toBeLessThan(h3Pos);
            expect(h3Pos).toBeLessThan(pPos);
        });
    });

    describe('renderResponseAnalysis', () => {
        const sampleResponses = [
            {
                questionIndex: 0,
                questionText: 'Can you show affection for your romantic partner in public without fear?',
                questionValue: 2,
                userAnswer: 1,
                userAnswerText: 'Yes',
                explanation: 'Being able to express affection publicly is a privilege many do not have.',
                privilegeType: 'social'
            },
            {
                questionIndex: 3,
                questionText: 'Have you ever been stopped or questioned by police because of your race?',
                questionValue: -2,
                userAnswer: 0,
                userAnswerText: 'No',
                explanation: 'Not being profiled by law enforcement is a significant privilege.',
                privilegeType: 'safety'
            }
        ];

        test('should return HTML with .debrief-section.response-analysis container', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('class="debrief-section response-analysis"');
        });

        test('should include h2 heading "Understanding Privilege in Context"', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
        });

        test('should include .response-cards wrapper', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('class="response-cards"');
        });

        test('should create a .response-card for each analyzed response', () => {
            const html = renderResponseAnalysis(sampleResponses);
            const cardCount = (html.match(/class="response-card"/g) || []).length;
            expect(cardCount).toBe(2);
        });

        test('should include question text in each card', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('Can you show affection for your romantic partner in public without fear?');
            expect(html).toContain('Have you ever been stopped or questioned by police because of your race?');
        });

        test('should display question text inside .question-text div', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('<div class="question-text">Can you show affection');
        });

        test('should include user answer as Yes/No', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('Your answer: Yes');
            expect(html).toContain('Your answer: No');
        });

        test('should display answer inside .your-answer div', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('<div class="your-answer">Your answer: Yes</div>');
            expect(html).toContain('<div class="your-answer">Your answer: No</div>');
        });

        test('should include contextual explanation for each response', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('Being able to express affection publicly is a privilege many do not have.');
            expect(html).toContain('Not being profiled by law enforcement is a significant privilege.');
        });

        test('should display explanation inside .explanation div', () => {
            const html = renderResponseAnalysis(sampleResponses);
            expect(html).toContain('<div class="explanation">Being able to express affection');
        });

        test('should handle empty array of responses', () => {
            const html = renderResponseAnalysis([]);
            expect(html).toContain('class="debrief-section response-analysis"');
            expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
            expect(html).toContain('class="response-cards"');
            expect(html).not.toContain('class="response-card"');
        });

        test('should handle non-array input gracefully', () => {
            const html = renderResponseAnalysis(null);
            expect(html).toContain('class="debrief-section response-analysis"');
            expect(html).not.toContain('class="response-card"');
        });

        test('should handle undefined input gracefully', () => {
            const html = renderResponseAnalysis(undefined);
            expect(html).toContain('class="debrief-section response-analysis"');
            expect(html).not.toContain('class="response-card"');
        });

        test('should derive answer text from userAnswer when userAnswerText is missing', () => {
            const responses = [
                {
                    questionIndex: 0,
                    questionText: 'Test question',
                    questionValue: 1,
                    userAnswer: 1,
                    explanation: 'Test explanation',
                    privilegeType: 'social'
                }
            ];
            const html = renderResponseAnalysis(responses);
            expect(html).toContain('Your answer: Yes');
        });

        test('should derive "No" from userAnswer 0 when userAnswerText is missing', () => {
            const responses = [
                {
                    questionIndex: 0,
                    questionText: 'Test question',
                    questionValue: -1,
                    userAnswer: 0,
                    explanation: 'Test explanation',
                    privilegeType: 'safety'
                }
            ];
            const html = renderResponseAnalysis(responses);
            expect(html).toContain('Your answer: No');
        });

        test('should handle response with missing questionText', () => {
            const responses = [{ userAnswer: 1, userAnswerText: 'Yes', explanation: 'Explanation' }];
            const html = renderResponseAnalysis(responses);
            expect(html).toContain('class="response-card"');
            expect(html).toContain('<div class="question-text"></div>');
        });

        test('should handle response with missing explanation', () => {
            const responses = [{ questionText: 'Q?', userAnswer: 1, userAnswerText: 'Yes' }];
            const html = renderResponseAnalysis(responses);
            expect(html).toContain('<div class="explanation"></div>');
        });

        test('should render multiple cards in order', () => {
            const html = renderResponseAnalysis(sampleResponses);
            const firstCardPos = html.indexOf('Can you show affection');
            const secondCardPos = html.indexOf('Have you ever been stopped');
            expect(firstCardPos).toBeLessThan(secondCardPos);
        });

        test('should maintain correct HTML nesting structure', () => {
            const html = renderResponseAnalysis(sampleResponses);
            const sectionPos = html.indexOf('class="debrief-section response-analysis"');
            const h2Pos = html.indexOf('<h2>');
            const cardsWrapperPos = html.indexOf('class="response-cards"');
            const firstCardPos = html.indexOf('class="response-card"');

            expect(sectionPos).toBeLessThan(h2Pos);
            expect(h2Pos).toBeLessThan(cardsWrapperPos);
            expect(cardsWrapperPos).toBeLessThan(firstCardPos);
        });
    });
});
