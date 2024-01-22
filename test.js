import { initializeApp, cert } from 'firebase-admin/app';

import { getFirestore } from 'firebase-admin/firestore';

import serviceAccount from './firebase-key.json' assert { type: 'json' };
import { assert } from 'console';

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

const col = db.collection('leetcode_actions');

const uniqueValuesSet = new Set();

(async () => {
    const collectionSnapshot = await col.get();
    collectionSnapshot.forEach((doc) => {
        // Access the field value and add it to the Set
        const fieldValue = doc.data()['problemNumber'];
        if (fieldValue == undefined) {
            console.log(doc.id);
        }
        uniqueValuesSet.add(fieldValue);
    });

    // Now uniqueValuesArray contains all unique values for the specified field
    console.log('Unique Values:', uniqueValuesSet.size);
})();
