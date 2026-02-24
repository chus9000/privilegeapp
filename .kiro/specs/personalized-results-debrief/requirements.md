# Requirements Document

## Introduction

This document specifies requirements for enhancing the results page with personalized debriefing sections. The feature transforms the current results display into a more educational and empathetic experience that helps participants understand privilege as a contextual concept and motivates them to be allies. The enhancement adds three new sections to the existing results page: score meaning debrief, individual response analysis, and maintains the existing ally tips functionality.

## Glossary

- **Results_Page**: The page displayed after a participant completes the quiz, showing their score and comparative analytics
- **Participant**: A user who has completed the privilege spectrum quiz
- **Privilege_Score**: A numeric value calculated from quiz responses, ranging from negative (less privileged) to positive (more privileged)
- **Score_Category**: Classification of a score as low, neutral, or high privilege based on the spectrum range
- **Response_Analysis**: Examination of individual question answers to provide contextual understanding
- **Debrief_Section**: An educational component that provides interpretation and guidance based on quiz results
- **Ally_Tips**: Actionable recommendations for supporting others based on privilege level
- **Context**: The specific circumstances or situations in which privilege manifests differently

## Requirements

### Requirement 1: Numeric Results Display

**User Story:** As a participant, I want to see my numeric score prominently displayed, so that I have a clear understanding of my privilege assessment.

#### Acceptance Criteria

1. THE Results_Page SHALL display the Participant's Privilege_Score in numeric format
2. WHEN the Privilege_Score is positive, THE Results_Page SHALL prefix the score with a "+" symbol
3. WHEN the Privilege_Score is negative, THE Results_Page SHALL display the score with a "-" symbol
4. THE Results_Page SHALL maintain the existing score display styling and positioning

### Requirement 2: Low Score Debrief

**User Story:** As a participant with a low privilege score, I want to receive encouraging and validating feedback, so that I feel acknowledged for overcoming obstacles.

#### Acceptance Criteria

1. WHEN a Participant's Score_Category is low privilege, THE Results_Page SHALL display a debrief message acknowledging challenging starting contexts
2. WHEN a Participant's Score_Category is low privilege, THE Results_Page SHALL display a debrief message celebrating progress despite obstacles
3. WHEN a Participant's Score_Category is low privilege, THE Results_Page SHALL use an encouraging and validating tone
4. THE Results_Page SHALL avoid language that reinforces deficit narratives or victimization

### Requirement 3: High Score Debrief

**User Story:** As a participant with a high privilege score, I want to understand my advantages in context, so that I can use them to help others.

#### Acceptance Criteria

1. WHEN a Participant's Score_Category is high privilege, THE Results_Page SHALL display a debrief message recognizing easier circumstances compared to others
2. WHEN a Participant's Score_Category is high privilege, THE Results_Page SHALL display a debrief message encouraging use of advantages to help others
3. WHEN a Participant's Score_Category is high privilege, THE Results_Page SHALL frame advantages as "superpowers" or similar empowering language
4. THE Results_Page SHALL avoid language that induces guilt or shame

### Requirement 4: Neutral Score Debrief

**User Story:** As a participant with a neutral privilege score, I want to understand my mixed privilege status, so that I can recognize both my advantages and challenges.

#### Acceptance Criteria

1. WHEN a Participant's Score_Category is neutral, THE Results_Page SHALL display a debrief message acknowledging mixed privilege status
2. WHEN a Participant's Score_Category is neutral, THE Results_Page SHALL display a debrief message explaining intersectionality of privilege
3. WHEN a Participant's Score_Category is neutral, THE Results_Page SHALL encourage recognition of both advantages and challenges
4. THE Results_Page SHALL use balanced and educational tone

### Requirement 5: Score Categorization

**User Story:** As the system, I want to categorize scores into privilege levels, so that I can provide appropriate debrief messages.

#### Acceptance Criteria

1. THE Results_Page SHALL calculate Score_Category based on the Participant's Privilege_Score relative to the spectrum range
2. WHEN a Privilege_Score is in the top 40% of the possible range, THE Results_Page SHALL categorize it as high privilege
3. WHEN a Privilege_Score is in the bottom 40% of the possible range, THE Results_Page SHALL categorize it as low privilege
4. WHEN a Privilege_Score is in the middle 20% of the possible range, THE Results_Page SHALL categorize it as neutral
5. THE Results_Page SHALL use the dynamic spectrum range for categorization calculations

### Requirement 6: Individual Response Analysis

**User Story:** As a participant, I want to see analysis of my individual answers, so that I can understand how privilege works in different contexts.

#### Acceptance Criteria

1. THE Results_Page SHALL display a Response_Analysis section for all participants regardless of Score_Category
2. WHEN displaying Response_Analysis, THE Results_Page SHALL show selected individual questions and the Participant's answers
3. WHEN displaying Response_Analysis, THE Results_Page SHALL provide contextual explanation for each selected question
4. THE Results_Page SHALL explain how privilege manifests differently in different contexts
5. THE Results_Page SHALL emphasize that privilege is contextual and can change

### Requirement 7: Response Selection Logic

**User Story:** As the system, I want to select meaningful responses to analyze, so that participants gain educational insights.

#### Acceptance Criteria

1. THE Results_Page SHALL select responses for analysis based on their educational value
2. WHEN selecting responses, THE Results_Page SHALL prioritize questions that demonstrate privilege variability
3. WHEN selecting responses, THE Results_Page SHALL include both positive and negative value questions when possible
4. THE Results_Page SHALL display between 3 and 5 analyzed responses per participant
5. THE Results_Page SHALL avoid overwhelming participants with too many analyzed responses

### Requirement 8: Contextual Privilege Education

**User Story:** As a participant, I want to learn that privilege is contextual, so that I understand it can change based on circumstances.

#### Acceptance Criteria

1. THE Response_Analysis SHALL include explanations demonstrating privilege as Context-dependent
2. THE Response_Analysis SHALL provide examples of how privilege changes across different situations
3. THE Response_Analysis SHALL explain that anyone can face difficult situations regardless of current privilege
4. THE Response_Analysis SHALL emphasize the importance of helping others

### Requirement 9: Ally Tips Integration

**User Story:** As a participant, I want to receive actionable ally tips, so that I know how to support others.

#### Acceptance Criteria

1. THE Results_Page SHALL display the existing Ally_Tips section
2. THE Results_Page SHALL maintain the current ally tips categorization by Score_Category
3. THE Results_Page SHALL position Ally_Tips as the final section of the results page
4. THE Results_Page SHALL preserve all existing ally tips functionality

### Requirement 10: Section Ordering

**User Story:** As a participant, I want information presented in a logical flow, so that I can easily understand my results.

#### Acceptance Criteria

1. THE Results_Page SHALL display sections in the following order: numeric results, score meaning debrief, response analysis, ally tips
2. THE Results_Page SHALL visually distinguish each Debrief_Section from others
3. THE Results_Page SHALL use clear section headings for each Debrief_Section
4. THE Results_Page SHALL maintain visual consistency with the existing design system

### Requirement 11: Tone and Language

**User Story:** As a participant, I want the debrief to use appropriate tone, so that I feel respected and motivated.

#### Acceptance Criteria

1. THE Results_Page SHALL use empathetic and non-judgmental language throughout all Debrief_Sections
2. THE Results_Page SHALL avoid language that induces guilt, shame, or victimization
3. THE Results_Page SHALL use educational and empowering language
4. THE Results_Page SHALL maintain consistency in tone across all Score_Categories

### Requirement 12: Free Play Mode Support

**User Story:** As a participant in free play mode, I want to receive the same personalized debrief, so that I benefit from the educational content.

#### Acceptance Criteria

1. WHEN a Participant completes the quiz in free play mode, THE Results_Page SHALL display all four debrief sections
2. WHEN in free play mode, THE Results_Page SHALL use the same score categorization logic
3. WHEN in free play mode, THE Results_Page SHALL provide the same Response_Analysis functionality
4. THE Results_Page SHALL integrate debrief sections with existing free play analytics

### Requirement 13: Event Mode Support

**User Story:** As a participant in event mode, I want to receive personalized debrief in the modal, so that I understand my results in context.

#### Acceptance Criteria

1. WHEN a Participant views their results in event mode, THE Results_Page SHALL display debrief sections in the participant modal
2. WHEN displaying the modal, THE Results_Page SHALL show score meaning debrief appropriate to the Participant's Score_Category
3. WHEN displaying the modal, THE Results_Page SHALL show Response_Analysis for the Participant
4. THE Results_Page SHALL maintain existing modal functionality while adding debrief content

### Requirement 14: Responsive Design

**User Story:** As a participant on any device, I want the debrief sections to display properly, so that I can read and understand the content.

#### Acceptance Criteria

1. THE Results_Page SHALL display all Debrief_Sections responsively on mobile devices
2. THE Results_Page SHALL display all Debrief_Sections responsively on tablet devices
3. THE Results_Page SHALL display all Debrief_Sections responsively on desktop devices
4. THE Results_Page SHALL maintain readability of debrief text across all screen sizes

### Requirement 15: Performance

**User Story:** As a participant, I want the results page to load quickly, so that I can immediately see my debrief.

#### Acceptance Criteria

1. THE Results_Page SHALL calculate Score_Category without noticeable delay
2. THE Results_Page SHALL generate Response_Analysis without noticeable delay
3. THE Results_Page SHALL render all Debrief_Sections within 500 milliseconds of page load
4. THE Results_Page SHALL not degrade performance of existing results page functionality
