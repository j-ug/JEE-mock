# Project Prompt History

This file contains a log of the primary requests and prompts provided during the development of this application.

## Session Log (May 15, 2026)

1. **Bug Fix**: Fixed React "Rules of Hooks" error in `AppContent` caused by conditional hook calls.
2. **Feature Update: Comparison Tab**:
    - Updated the "Compare Success" tab so students see actual usernames instead of ID numbers.
    - Modified the leaderboard to display the Top 10 students for every single exam (instead of just the top 3).
    - Updated Firestore rules to allow students to read user profiles for display names.
    - Updated `TestInterface` to record the `userName` at the time of submission.
3. **User Experience: Secure Terminal**:
    - Added a "Preparation Protocol" screen for students before they initialize the secure terminal.
    - Included a "Go Back" option to ensure students are fully prepared before starting the exam.
    - Beautified the preparation modal with a high-fidelity design.

## Session Log (May 23, 2026)

### 15:42 (Approx.) - Fix Build Issue
*   **Request**: "The app failed to build. Identify the issue in the app code and fix it."
*   **Change**: Fixed invalid JSX nesting, unclosed tags, and syntax errors within `src/pages/AdminDashboard.tsx`.
*   **Effect**: Resolved production build failures, enabling successful compilation and preview deployment.

### 15:46 (Approx.) - Admin Dashboard Enhancements (User-driven)
*   **Request**: Direct implementation of features in `AdminDashboard.tsx`.
*   **Change**:
    *   Extended `activeTab` type to include 'surf'.
    *   Added "Surf with AI" tab to navigation sidebar.
    *   Updated Dashboard Header to conditionally display the new tab name.
    *   Added "Export to Sheets" and "Export Paper to Docs" buttons to submission review.
    *   Refactored `AdminDashboard.tsx` layout to fix DOM structure.
*   **Effect**: New functional tabs and export utilities were added to the Admin Dashboard, enhancing management capabilities while maintaining build stability.

### 16:16 (Approx.) - Replaced Welcome Screen with 3D Spline Scene
*   **Request**: Replaced the previous "Welcome Back" shader animation with a new 3D Spline scene integrated with a spotlight effect.
*   **Change**:
    *   Added `@splinetool/runtime`, `@splinetool/react-spline`, `framer-motion` dependencies.
    *   Created `SplineScene`, `Spotlight` (Ibelick version), and `Card` components.
    *   Added `AceternitySpotlight` for completeness.
    *   Implemented `SplineSceneBasic` demo component.
    *   Updated `App.tsx` to display `SplineSceneBasic` as the welcome screen.
*   **Effect**: The application now features an interactive 3D landing animation on startup, enhancing visual appeal.

### 16:30 (Approx.) - Add Click-to-Dismiss to Welcome Screen
*   **Request**: Make the welcome screen fade away instantly if a user clicks on it.
*   **Change**: Added an `onClick` handler and `cursor-pointer` class to the welcome screen `motion.div` in `App.tsx` that triggers `setShowWelcome(false)`.
*   **Effect**: Users can now instantly bypass the landing animation by clicking anywhere on the welcome screen.

### 16:37 (Approx.) - Update Landing Screen Text
*   **Request**: Change "Interacctive AI" to "Inter-active AI" on the welcome screen.
*   **Change**: Updated `src/components/ui/spline-demo.tsx`.
*   **Effect**: The landing screen now displays the corrected title.

