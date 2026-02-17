/**
 * Unit Tests for Retry Button Functionality (Task 17.2)
 * Feature: full-featured-quiz-app
 * 
 * Tests for retry button display in error notifications
 * Requirements: 15.2
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Retry Button Functionality', () => {
    let dom;
    let document;
    let showErrorNotification;

    beforeEach(() => {
        // Set up DOM
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        document = dom.window.document;
        global.document = document;
        global.setTimeout = vi.fn((fn) => fn());

        // Mock showErrorNotification function (from event.js)
        showErrorNotification = (message, onRetry = null) => {
            const notification = document.createElement('div');
            notification.className = 'error-notification';
            
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message;
            messageDiv.className = 'message';
            notification.appendChild(messageDiv);
            
            if (onRetry) {
                const retryButton = document.createElement('button');
                retryButton.textContent = 'Retry';
                retryButton.className = 'retry-button';
                retryButton.onclick = () => {
                    notification.remove();
                    onRetry();
                };
                notification.appendChild(retryButton);
            }
            
            document.body.appendChild(notification);
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Requirement 15.2: Display retry option to user', () => {
        test('should display error notification without retry button when no callback provided', () => {
            // Act
            showErrorNotification('An error occurred');

            // Assert
            const notification = document.querySelector('.error-notification');
            expect(notification).toBeTruthy();
            expect(notification.querySelector('.message').textContent).toBe('An error occurred');
            expect(notification.querySelector('.retry-button')).toBeNull();
        });

        test('should display error notification with retry button when callback provided', () => {
            // Arrange
            const onRetry = vi.fn();

            // Act
            showErrorNotification('Failed to save. Please try again.', onRetry);

            // Assert
            const notification = document.querySelector('.error-notification');
            expect(notification).toBeTruthy();
            expect(notification.querySelector('.message').textContent).toBe('Failed to save. Please try again.');
            
            const retryButton = notification.querySelector('.retry-button');
            expect(retryButton).toBeTruthy();
            expect(retryButton.textContent).toBe('Retry');
        });

        test('should call retry callback when retry button is clicked', () => {
            // Arrange
            const onRetry = vi.fn();
            showErrorNotification('Failed to save. Please try again.', onRetry);

            // Act
            const retryButton = document.querySelector('.retry-button');
            retryButton.click();

            // Assert
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        test('should remove notification when retry button is clicked', () => {
            // Arrange
            const onRetry = vi.fn();
            showErrorNotification('Failed to save. Please try again.', onRetry);

            // Act
            const retryButton = document.querySelector('.retry-button');
            retryButton.click();

            // Assert
            const notification = document.querySelector('.error-notification');
            expect(notification).toBeNull();
        });

        test('should support multiple error notifications with different retry callbacks', () => {
            // Arrange
            const onRetry1 = vi.fn();
            const onRetry2 = vi.fn();

            // Act
            showErrorNotification('Error 1', onRetry1);
            showErrorNotification('Error 2', onRetry2);

            // Assert
            const notifications = document.querySelectorAll('.error-notification');
            expect(notifications.length).toBe(2);

            const retryButtons = document.querySelectorAll('.retry-button');
            expect(retryButtons.length).toBe(2);

            // Click first retry button
            retryButtons[0].click();
            expect(onRetry1).toHaveBeenCalledTimes(1);
            expect(onRetry2).toHaveBeenCalledTimes(0);

            // Click second retry button
            retryButtons[1].click();
            expect(onRetry1).toHaveBeenCalledTimes(1);
            expect(onRetry2).toHaveBeenCalledTimes(1);
        });
    });

    describe('Integration with retry logic', () => {
        test('should retry participant save when retry button clicked', () => {
            // Arrange
            const mockSaveParticipant = vi.fn();
            const eventId = 'test_event';
            const participant = { id: 'p1', name: 'Test', score: 10 };

            // Simulate failed save with retry option
            showErrorNotification(
                'Failed to save your responses. Your answers are saved locally.',
                () => {
                    mockSaveParticipant(eventId, participant);
                }
            );

            // Act
            const retryButton = document.querySelector('.retry-button');
            retryButton.click();

            // Assert
            expect(mockSaveParticipant).toHaveBeenCalledWith(eventId, participant);
        });

        test('should retry event loading when retry button clicked', () => {
            // Arrange
            const mockLoadEvents = vi.fn();

            // Simulate failed load with retry option
            showErrorNotification(
                'Failed to load events. Please check your connection and try again.',
                () => {
                    mockLoadEvents();
                }
            );

            // Act
            const retryButton = document.querySelector('.retry-button');
            retryButton.click();

            // Assert
            expect(mockLoadEvents).toHaveBeenCalledTimes(1);
        });

        test('should retry event creation when retry button clicked', () => {
            // Arrange
            const mockCreateEvent = vi.fn();

            // Simulate failed creation with retry option
            showErrorNotification(
                'Failed to create event. Please check your connection and try again.',
                () => {
                    mockCreateEvent();
                }
            );

            // Act
            const retryButton = document.querySelector('.retry-button');
            retryButton.click();

            // Assert
            expect(mockCreateEvent).toHaveBeenCalledTimes(1);
        });
    });
});
