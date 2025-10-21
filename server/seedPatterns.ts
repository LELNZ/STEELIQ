import { seedPatternLibrary } from './services/seedPatternLibrary';

seedPatternLibrary()
  .then(() => {
    console.log('🎉 Pattern library seeding complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to seed:', error);
    process.exit(1);
  });