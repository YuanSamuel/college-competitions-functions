import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();

export const expireOpportunities = functions.pubsub
  .schedule('* * * * *')
  .onRun(async (context) => {
      console.log('run expire');
    const now = admin.firestore.Timestamp.now();

    const query = db.collection('events').where('date', '<=', now);

    const tasks = await query.get();

    const jobs: Promise<any>[] = [];

    console.log(tasks);
    tasks.forEach((snapshot) => {
      jobs.push(snapshot.ref.delete());
      const registered = snapshot.get('registered');
      registered.forEach((user: string) => {
        jobs.push(
          db
            .collection('users')
            .doc(user)
            .update({
              points: admin.firestore.FieldValue.increment(
                snapshot.get('points')
              ),
            })
        );
        console.log('updated: ' + user);
      });
      jobs.push(
        db
          .collection('colleges')
          .doc(snapshot.get('college'))
          .update({
            points: admin.firestore.FieldValue.increment(
              snapshot.get('points') * snapshot.get('registered').length
            ),
          })
      );
    });

    return Promise.all(jobs);
  });
