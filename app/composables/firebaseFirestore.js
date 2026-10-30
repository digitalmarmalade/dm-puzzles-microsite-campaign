import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore'

export class FirebaseFirestore {

    constructor() {
        this.outputDetailsToConsole = 0
    }

    async delete(nodes, path) {
        this.outputDetailsToConsole && console.log('delete:', nodes.join('/'), JSON.stringify(path))

        let data = {}
        data[path] = deleteField()

        return await updateDoc(doc(getFirestore(), ...nodes), data);
    }

    async remove(nodes) {
        this.outputDetailsToConsole && console.log('remove:', nodes.join('/'))

        return await deleteDoc(doc(getFirestore(), ...nodes))
    }

    async query(nodes, criteria) {
        this.outputDetailsToConsole && console.log('query:', nodes.join('/'), JSON.stringify(criteria))
        const q = query(collection(getFirestore(), ...nodes), where(...criteria));

        return await getDocs(q)
    }

    async read(nodes) {
        this.outputDetailsToConsole && console.log('read:', nodes.join('/'))
        const docSnap = await getDoc(doc(getFirestore(), ...nodes));

        return docSnap.data()
    }

    async update(nodes, data) {
        this.outputDetailsToConsole && console.log('update:', nodes.join('/'), JSON.stringify(data))

        return await updateDoc(doc(getFirestore(), ...nodes), data);
    }

    async write(nodes, data) {
        this.outputDetailsToConsole && console.log('write:', nodes.join('/'), JSON.stringify(data))

        return await setDoc(doc(getFirestore(), ...nodes), data);
    }

    getNewDocumentId(nodes) {
        this.outputDetailsToConsole && console.log('getNewDocumentId:', nodes.join('/'))
        const firestoreDoc = doc(collection(getFirestore(), nodes.join('/')))

        return firestoreDoc.id
    }
}
