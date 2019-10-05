import autobind from 'autobind-decorator';
import Mute from '../../../../models/mute';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';

export default class extends Channel {
	public readonly chName = 'hashtag';
	public static shouldShare = false;
	public static requireCredential = false;

	@autobind
	public async init(params: any) {
		const mute = this.user ? await Mute.find({ muterId: this.user._id }) : null;
		const mutedUserIds = mute ? mute.map(m => m.muteeId.toString()) : [];

		const q: string[][] = params.q;

		if (q == null) return;

		// Subscribe stream
		this.subscriber.on('hashtag', async note => {
			const noteTags = note.tags.map((t: string) => t.toLowerCase());
			const matched = q.some(tags => tags.every(tag => noteTags.includes(tag.toLowerCase())));
			if (!matched) return;
			const { protectLocalOnlyNotes } = this.user ? { protectLocalOnlyNotes: false } : await fetchMeta();

			// Renoteなら再pack
			if (note.renoteId != null) {
				note.renote = await pack(note.renoteId, this.user, {
					detail: true,
					unauthenticated: protectLocalOnlyNotes
				});
			}

			// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
			if (shouldMuteThisNote(note, mutedUserIds)) return;

			this.send('note', note);
		});
	}
}
