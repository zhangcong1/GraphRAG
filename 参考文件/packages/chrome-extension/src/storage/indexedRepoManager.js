"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexedRepoManager = void 0;
class IndexedRepoManager {
    static STORAGE_KEY = 'indexedRepositories';
    static async addIndexedRepo(repo) {
        const repoData = {
            ...repo,
            indexedAt: Date.now()
        };
        const existingRepos = await this.getIndexedRepos();
        const updatedRepos = existingRepos.filter(r => r.id !== repo.id);
        updatedRepos.unshift(repoData);
        const limitedRepos = updatedRepos.slice(0, 5);
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: limitedRepos }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async getIndexedRepos() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([this.STORAGE_KEY], (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve(items[this.STORAGE_KEY] || []);
                }
            });
        });
    }
    static async isRepoIndexed(repoId) {
        const repos = await this.getIndexedRepos();
        return repos.find(repo => repo.id === repoId) || null;
    }
    static async removeIndexedRepo(repoId) {
        const existingRepos = await this.getIndexedRepos();
        const updatedRepos = existingRepos.filter(r => r.id !== repoId);
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: updatedRepos }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async updateLastSearchTime(repoId) {
        const repos = await this.getIndexedRepos();
        const repo = repos.find(r => r.id === repoId);
        if (repo) {
            repo.lastSearchAt = Date.now();
            return new Promise((resolve, reject) => {
                chrome.storage.local.set({ [this.STORAGE_KEY]: repos }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
    }
    static async getRecentlyIndexedRepos(limit = 10) {
        const repos = await this.getIndexedRepos();
        return repos
            .sort((a, b) => b.indexedAt - a.indexedAt)
            .slice(0, limit);
    }
    static async cleanupOldRepos(daysOld = 30) {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const repos = await this.getIndexedRepos();
        const activeRepos = repos.filter(repo => repo.indexedAt > cutoffTime);
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: activeRepos }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.IndexedRepoManager = IndexedRepoManager;
//# sourceMappingURL=indexedRepoManager.js.map