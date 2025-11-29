/**
 * JCar Design System - Shadows
 *
 * Shadow styles for cards, modals, and elevated elements.
 * Based on the UI/UX Improvement PRD.
 */

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Android elevation
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5, // Android elevation
  },
};

export default shadows;
