import {defineStore} from 'pinia'

export const useGroupsStore = defineStore('groupsStore', {
    state: () => {
        return {
            groups: {},
            loaded: false,
        }
    },
    actions: {
        async groupCreate(data, member) {

            let group = {};
            this.id = this.getFirebaseFirestore().getNewDocumentId(['groups'])

            group.id = this.id
            group.name = data.name
            group.created_by = member.uid
            group.created_at = (new Date()).getTime()
            group.members = {}

            let creator = {
                uid: member.uid,
                name: member.name,
                roles: ['owner', 'admin'],
            }
            creator = this.memberAddStatus(creator, 'member', group.created_by)
            group.members[member.uid] = creator;
            group.puzzles = data.variants

            this.groups[this.id] = group
            this.currentGroup = group

            let groupName = this.displayName
            this.feedback = {
                message: `${groupName} has been created`,
            }

            member.addGroup(group)

            await this.getFirebaseFirestore().write(['groups', this.id], group)

            return group;
        },
        async groupJoin(code, member) {
            //  check group exists
            let group = await this.getFirebaseFirestore().read(['groups', code])
            if (!group) {
                return new Feedback(`Group not found`, {type: 'negative'})
            }

            this.currentGroup = group
            let groupName = this.displayName

            //  if user is already part of group
            const groupMember = this.getMember(member.uid)
            if (groupMember) {
                let message = `You are already a member of ${groupName}`;
                switch (groupMember.status) {
                    case 'applied':
                        message = `You have already applied to ${groupName}`;
                        break;
                }

                return new Feedback(message, {type: 'negative'})
            }

            if (!this.groupCanApply() || !this.memberRequestToJoin(member)) {
                return new Feedback(`Group not found`, {type: 'negative'})
            }
            member.joinGroup(this.currentGroup)
            return new Feedback(`You have applied to join ${groupName}`)
        },
        getFirebaseFirestore() {
            this.Firestore = this.Firestore || new FirebaseFirestore();

            return this.Firestore
        },
        getMember(id) {
            this.currentGroup.members = this.currentGroup.members || {}
            return this.currentGroup.members[id] || null
        },
        getMemberList(keyField, valField) {
            const list = {};
            Object.entries(this.currentGroup.members).forEach((arr) => {
                let item = arr[1];
                item.id = arr[0];
                list[item[keyField]] = valField ? item[valField] : item
            });
            return list
        },
        groupCanApply() {
            return true
        },
        async groupSetCurrent(id) {
            do {
                await new Promise(resolve => setTimeout(resolve, 100));
            } while (!this.loaded);

            this.currentGroup = this.groups[id] || null

            return this.currentGroup
        },
        groupRename(name) {
            this.currentGroup.name = name
            if (this.groups[this.currentGroup.id]) this.groups[this.currentGroup.id].name = name
            this.getFirebaseFirestore().update(['groups', this.currentGroup.id], {name})
        },
        async groupDelete(member) {
            const id = this.currentGroup.id
            await this.getFirebaseFirestore().remove(['groups', id])
            delete this.groups[id]
            this.currentGroup = null
            member.leaveGroup(id)
        },
        groupUpdatePuzzleTypes(puzzleTypes) {
            this.currentGroup.puzzles = puzzleTypes
            this.getFirebaseFirestore().update(['groups', this.currentGroup.id], {
                'puzzles': puzzleTypes,
            });
            return new Feedback('The included puzzles have been updated')
        },
        memberAddStatus(member, status, status_by) {
            member.status = status
            member.status_at = (new Date()).getTime()
            member.status_by = status_by
            member.status_history = member.status_history || []
            member.status_history.push({
                status: member.status,
                status_at: member.status_at,
                status_by: member.status_by,
            })
            return member
        },
        memberHasPrivilege(member, privilege) {
            const groupMember = this.getMember(member.uid)

            switch (privilege) {
                case 'edit':
                    if (!groupMember || !groupMember.roles) return false
                    return ['owner', 'admin'].filter(x => groupMember.roles.includes(x)).length
                case 'view':
                    return ['owner', 'admin', 'member'].filter(x => groupMember.status.includes(x)).length
                default:
                    return false
            }
        },
        memberRequestToJoin(member) {
            if (this.getMember(member.uid)) return false

            let obj = {
                id: member.uid,
                name: member.name,
            }
            obj = this.memberAddStatus(obj, 'applied', member.uid)
            this.currentGroup.members[member.uid] = obj

            let data = {}
            data['members.' + member.uid] = obj
            this.getFirebaseFirestore().update(['groups', this.currentGroup.id], data)

            return true
        },
        memberRequestToJoinAccept(memberId) {
            const groupName = this.displayName
            let groupMember = this.getMember(memberId)
            if (!groupMember) return

            groupMember = this.memberAddStatus(groupMember, 'member', useUserStore().uid)
            let data = {}
            data['members.' + memberId] = groupMember
            this.getFirebaseFirestore().update(
                ['groups', this.currentGroup.id],
                data,
            )

            return new Feedback(
                `${groupMember.name} has been accepted into ${groupName}`,
                {
                    size: 'small',
                    type: 'positive',
                }
            )
        },
        memberRemove(memberId) {
            const groupName = this.displayName
            const groupMember = this.getMember(memberId)
            if (!groupMember) return

            const memberName = groupMember.name || groupMember.email || 'The player'

            delete this.currentGroup.members[memberId]
            this.getFirebaseFirestore().delete(
                ['groups', this.currentGroup.id],
                'members.' + memberId,
            )

            return new Feedback(
                `${memberName} has been removed from ${groupName}`,
                {
                    size: 'small',
                    type: 'positive',
                }
            )
        },
        memberRequestToJoinDecline(memberId) {
            const groupName = this.displayName
            let groupMember = this.getMember(memberId)
            if (!groupMember) return

            groupMember = this.memberAddStatus(groupMember, 'declined', useUserStore().uid)
            let data = {}
            data['members.' + memberId] = groupMember
            this.getFirebaseFirestore().update(
                ['groups', this.currentGroup.id],
                data,
            )

            return new Feedback(
                `${groupMember.name} has been declined entry to ${groupName}`,
                {
                    size: 'small',
                    type: 'negative',
                    button: {
                        size: 'sm',
                        variant: 'danger',
                        text: 'Undo',
                    }
                }
            )
        },
    },
    getters: {
        isLoaded: (state) => state.loaded === true,
        displayName() {
            if (!this.currentGroup) {
                return ''
            }
            let name = this.currentGroup.name
            return name.startsWith('The ') ? name : `The ${name}`
        },
    },

})
