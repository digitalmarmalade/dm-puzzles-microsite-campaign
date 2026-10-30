import {defineStore} from 'pinia'

export const useUserStore = defineStore('userStore', {
    state: () => {
        //  always return an object — Pinia runs toRefs() on the state, and
        //  toRefs(null) (logged out, when the cookie is empty) warns
        const userCookie = useCookie('user')
        return {...userCookie.value}
    },
    getters: {
        groupsList() {
            return this.groupsListObject
        },
        isLoaded: (state) => state.loaded === true,
    },
    actions: {
        async addDatabaseListener(user) {
            //console.log('addListener: User');
            this.uid = user.uid

            this.getFirebaseDatabase()
                .listen(['users', this.uid], (data) => {
                    for (let n in data) {
                        this[n] = data[n]
                    }
                    const userCookie = ref(useCookie('user'))
                    userCookie.value = this.getSanitisedUserData(data)
                    if (!this.loaded) {
                        this.readGroups()
                    }
                })
        },
        async createUser(userCredential) {
            const userData = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
            };

            return await this.getFirebaseDatabase()
                .write(['users', userCredential.user.uid], userData)
        },
        async readGroups() {
            //console.log('readGroups');
            const groupStore = useGroupsStore()

            let obj = {}
            if (this.groups?.length) {
                const data = await this.getFirebaseFirestore().query(['groups'], ['id', 'in', this.groups])
                data.forEach((group) => {
                    obj[group.id] = this.getSanitisedGroupData(group.data())
                });
            }
            groupStore.groups = obj
            groupStore.loaded = true
            this.updateGroupList()
        },
        async write(path, data) {
            return await this.getFirebaseDatabase()
                .write(['users', this.uid, path.replaceAll('.', '/')], data)
        },
        addGroup(group) {
            this.groups = this.groups || []
            this.groups.push(group.id);
            this.write('groups', this.groups)
            this.updateGroupList()
        },
        getFirebaseDatabase() {
            this.Database = this.Database || new FirebaseDatabase();

            return this.Database
        },
        getFirebaseFirestore() {
            this.Firestore = this.Firestore || new FirebaseFirestore();

            return this.Firestore
        },
        leaveGroup(id) {
            this.groups = (this.groups || []).filter(g => g !== id)
            this.write('groups', this.groups)
            this.updateGroupList()
        },
        joinGroup(group) {
            this.groups = this.groups || []
            this.groups.push(group.id);
            this.write('groups', this.groups)
            useGroupsStore().groups[group.id] = this.getSanitisedGroupData(group)
            this.updateGroupList()
        },
        onSignOut() {
            this.removeListeners()
            this.loaded = false
            ref(useCookie('user')).value = null
        },
        onStateChange(user) {
            //console.log('addListeners');
            this.addDatabaseListener(user)
        },
        removeListeners() {
            this.getFirebaseDatabase().removeListeners(['users', this.uid])
        },
        setName(name) {
            this.name = name
            this.write('name', name)
            this.setNameInGroups()
        },
        setNameInGroups() {
            const groups = useGroupsStore()
            this.groups = this.groups || []
            this.groups.forEach((g) => {
                if (groups.groups[g]?.members?.[this.uid]) {
                    groups.groups[g].members[this.uid].name = this.name
                    let data = {}
                    data['members.' + this.uid + '.name'] = this.name
                    this.getFirebaseFirestore().update(
                        ['groups', g],
                        data,
                    )
                }
            })
        },
        getSanitisedGroupData(data) {
            return {
                id: data.id,
                members: data.members,
                name: data.name,
                puzzles: data.puzzles,
            }
            //  todo: remove member status history etc
        },
        getSanitisedUserData(data) {
            return data
        },
        updateGroupList() {
            //console.log('updateGroupList');
            const groupsStore = useGroupsStore()
            this.groups = this.groups || []
            let groupsList = this.groups.map((g) => {
                //  todo: check member is part of group
                return groupsStore.groups ? groupsStore.groups[g] : null
            })

            this.groupsListObject = Object.fromEntries(groupsList.filter(x => x).map(item => [item.id, item]))
            this.loaded = true
        },
    },
})
