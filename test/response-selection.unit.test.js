import { describe, it, expect } from 'vitest';
import { selectResponsesForAnalysis } from '../debrief-engine.js';

describe('selectResponsesForAnalysis', () => {
    const mockQuestions = [
        { text: "Question 1 negative", value: -1 },
        { text: "Question 2 positive", value: 1 },
        { text: "Question 3 negative", value: -1 },
        { text: "Question 4 positive", value: 1 },
        { text: "Question 5 negative", value: -1 },
        { text: "Question 6 positive", value: 1 },
    ];

    it('should return empty array when answers is null', () => {
        expect(selectResponsesForAnalysis(null, mockQuestions)).toEqual([]);
    });

    it('should return empty array when answers is undefined', () => {
        expect(selectResponsesForAnalysis(undefined, mockQuestions)).toEqual([]);
    });

    it('should return empty array when questions is null', () => {
        expect(selectResponsesForAnalysis([1, 0, 1], null)).toEqual([]);
    });

    it('should return empty array when questions is not an array', () => {
        expect(selectResponsesForAnalysis([1, 0], 'not-an-array')).toEqual([]);
    });

    it('should return empty array when questions is empty', () => {
        expect(selectResponsesForAnalysis([1, 0], [])).toEqual([]);
    });

    it('should return empty array when no questions are answered', () => {
        const answers = [null, undefined, null, undefined, null, undefined];
        expect(selectResponsesForAnalysis(answers, mockQuestions)).toEqual([]);
    });

    it('should handle array answer format', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle object answer format with string keys', () => {
        const answers = { '0': 1, '1': 0, '2': 1, '3': 0, '4': 1, '5': 0 };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle object answer format with numeric keys', () => {
        const answers = { 0: 1, 1: 0, 2: 1, 3: 0, 4: 1, 5: 0 };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should select 4 questions by default', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBe(4);
    });

    it('should clamp count to minimum of 3', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions, 1);
        expect(result.length).toBe(3);
    });

    it('should clamp count to maximum of 5', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions, 10);
        expect(result.length).toBe(5);
    });

    it('should return fewer than 3 if not enough answered questions exist', () => {
        const questions = [
            { text: "Q1", value: 1 },
            { text: "Q2", value: -1 },
        ];
        const answers = [1, 0];
        const result = selectResponsesForAnalysis(answers, questions);
        expect(result.length).toBe(2);
    });

    it('should prioritize questions with |value| >= 1', () => {
        const questions = [
            { text: "Low value", value: 0.5 },
            { text: "High neg", value: -2 },
            { text: "High pos", value: 2 },
            { text: "Low value", value: 0.3 },
            { text: "High neg", value: -1 },
            { text: "High pos", value: 1 },
        ];
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, questions);
        result.forEach(r => {
            expect(Math.abs(r.questionValue)).toBeGreaterThanOrEqual(1);
        });
    });

    it('should fall back to all answered when fewer than 3 high-value exist', () => {
        const questions = [
            { text: "Low value 1", value: 0.5 },
            { text: "High pos", value: 1 },
            { text: "Low value 2", value: 0.3 },
            { text: "Low value 3", value: 0.2 },
        ];
        const answers = [1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, questions);
        expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should balance selection between positive and negative value questions', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        const positiveCount = result.filter(r => r.questionValue > 0).length;
        const negativeCount = result.filter(r => r.questionValue < 0).length;
        expect(positiveCount).toBeGreaterThanOrEqual(1);
        expect(negativeCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle all positive value questions', () => {
        const questions = [
            { text: "Q1", value: 1 },
            { text: "Q2", value: 2 },
            { text: "Q3", value: 1 },
            { text: "Q4", value: 3 },
        ];
        const answers = [1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, questions);
        expect(result.length).toBeGreaterThanOrEqual(3);
        result.forEach(r => expect(r.questionValue).toBeGreaterThan(0));
    });

    it('should handle all negative value questions', () => {
        const questions = [
            { text: "Q1", value: -1 },
            { text: "Q2", value: -2 },
            { text: "Q3", value: -1 },
            { text: "Q4", value: -3 },
        ];
        const answers = [1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, questions);
        expect(result.length).toBeGreaterThanOrEqual(3);
        result.forEach(r => expect(r.questionValue).toBeLessThan(0));
    });

    it('should sort selected responses by question index', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        for (let i = 1; i < result.length; i++) {
            expect(result[i].questionIndex).toBeGreaterThan(result[i - 1].questionIndex);
        }
    });

    it('should return objects with expected properties', () => {
        const answers = [1, 0, 1, 0, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        result.forEach(r => {
            expect(r).toHaveProperty('questionIndex');
            expect(r).toHaveProperty('questionText');
            expect(r).toHaveProperty('questionValue');
            expect(r).toHaveProperty('userAnswer');
            expect(typeof r.questionIndex).toBe('number');
            expect(typeof r.questionText).toBe('string');
            expect(typeof r.questionValue).toBe('number');
        });
    });

    it('should exclude unanswered questions from array answers', () => {
        const answers = [1, null, 0, undefined, 1, 0];
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        result.forEach(r => {
            expect(r.userAnswer === 0 || r.userAnswer === 1).toBe(true);
        });
    });

    it('should exclude unanswered questions from object answers', () => {
        const answers = { '0': 1, '2': 0, '4': 1 };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBe(3);
        result.forEach(r => {
            expect(r.userAnswer === 0 || r.userAnswer === 1).toBe(true);
        });
    });
});
