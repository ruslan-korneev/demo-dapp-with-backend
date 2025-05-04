import { TonProofItemReplySuccess } from '@tonconnect/protocol';
import { Account } from '@tonconnect/sdk';
import axios from 'axios';
import { connector } from './connector';
import './patch-local-storage-for-github-pages';

class TonProofDemoApiService {
	localStorageKey = 'demo-api-access-token';

	api = axios.create({
		baseURL: 'http://0.0.0.0:8000',
		headers: {
			'Content-Type': 'application/json',
			Origin: 'http://192.168.253.154:3000',
		},
	});
	accessToken: string | null = null;

	constructor() {
		this.accessToken = localStorage.getItem(this.localStorageKey);

		connector.onStatusChange((wallet) => {
			if (!wallet) {
				this.reset();
				return;
			}

			const tonProof = wallet.connectItems?.tonProof;

			if (tonProof) {
				if ('proof' in tonProof) {
					this.checkProof(tonProof.proof, wallet.account);
					return;
				}

				console.error(tonProof.error);
			}

			if (!this.accessToken) {
				connector.disconnect();
			}
		});
	}

	async generatePayload() {
		const response = await this.api.get('/auth/ton', {
			headers: {
				Origin: 'http://localhost:3000',
			},
		});
		const data = response.data;
		return data.payload as string;
	}

	async checkProof(proof: TonProofItemReplySuccess['proof'], account: Account) {
		try {
			const reqBody = {
				address: account.address,
				network: account.chain,
				proof: {
					...proof,
					state_init: account.walletStateInit,
				},
			};

			const response = await this.api.post('/auth/ton', reqBody);
			const data = response.data;

			if (data?.token) {
				localStorage.setItem(this.localStorageKey, data.token);
				this.accessToken = data.token;
				this.api.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
			}
		} catch (e) {
			console.log('checkProof error:', e);
		}
	}

	async getAccountInfo() {
		this.api.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
		const response = await this.api.get('/profile');
		return response.data as {};
	}

	reset() {
		this.accessToken = null;
		localStorage.removeItem(this.localStorageKey);
	}
}

export const TonProofDemoApi = new TonProofDemoApiService();
