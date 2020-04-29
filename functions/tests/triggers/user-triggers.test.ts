import { triggerEventsWhenUserIsCreated } from '../../src/users/index'
import * as firebase from '@firebase/testing';
import * as Test from 'firebase-functions-test';

const projectId = 'reach-4-help-test';
/**
 * Creates a new app with admin authentication.
 *
 * @return {object} the app.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminApp = () => {
  return firebase.initializeAdminApp({ projectId }).firestore();
};

beforeEach(async () => {
  // Clear the database between tests
  await firebase.clearFirestoreData({ projectId });
});

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()));
});

const test = Test();

describe('user triggers', () => {
  it('should delete invalid data', async () => {
    const db = adminApp();
    let userRef = db.collection('users').doc('user1');
    
    return userRef.set({displayName: 'fsdfs'})
    .then((result): Promise<firebase.firestore.DocumentSnapshot> =>{
      return userRef.get()
    })
    .then(snap=>{
        let wrapped = test.wrap(triggerEventsWhenUserIsCreated);
        return wrapped(snap, {
          params: {
            userId: 'user1'
          }
        }) 
    })
    .then(()=>{
      return userRef.get()
    })
    .then(snapAfter=>{
      expect(snapAfter.exists).toBeFalsy();
    })

  });
});
