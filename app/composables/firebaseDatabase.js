import {getDatabase, off, onValue, ref as dbRef, set} from 'firebase/database';

export class FirebaseDatabase {

    constructor() {
        this.outputDetailsToConsole = 0
    }

    async listen(nodes, callback) {
        this.outputDetailsToConsole && console.log('listen:', nodes.join('/'))

        onValue(dbRef(getDatabase(), nodes.join('/')), (snapshot) => {
            callback(snapshot.val());
        });
    }

    async removeListeners(nodes) {
        this.outputDetailsToConsole && console.log('removeListeners:', nodes.join('/'))

        return off(dbRef(getDatabase(), nodes.join('/')))
    }

    async write(nodes, data) {
        this.outputDetailsToConsole && console.log('write:', nodes.join('/'), JSON.stringify(data))

        return await set(dbRef(getDatabase(), nodes.join('/')), data);
    }
}
