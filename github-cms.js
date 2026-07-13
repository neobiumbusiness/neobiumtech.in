/**
 * github-cms.js
 * 
 * Serverless GitHub API Integration for Neobium CMS.
 * Allows pushing configuration changes directly from the static GitHub Pages site.
 */

class GitHubCMS {
    constructor() {
        this.loadCredentials();
    }

    loadCredentials() {
        try {
            const creds = JSON.parse(localStorage.getItem('github-cms-credentials'));
            this.token = creds?.token || '';
            this.owner = creds?.owner || '';
            this.repo = creds?.repo || '';
        } catch(e) {
            this.token = '';
            this.owner = '';
            this.repo = '';
        }
    }

    saveCredentials(token, owner, repo) {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        localStorage.setItem('github-cms-credentials', JSON.stringify({ token, owner, repo }));
    }

    hasCredentials() {
        return !!(this.token && this.owner && this.repo);
    }

    promptForCredentials() {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="gh-cms-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                    <div style="background: white; padding: 2rem; border-radius: 8px; width: 400px; max-width: 90%; color: #333; font-family: sans-serif;">
                        <h3 style="margin-top: 0;">GitHub Connection Required</h3>
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1.5rem;">To save changes globally from this static page, please provide a GitHub Personal Access Token with 'repo' scope.</p>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 0.3rem;">Repository Owner (e.g. your-username)</label>
                            <input type="text" id="gh-owner" value="${this.owner}" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="owner">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 0.3rem;">Repository Name</label>
                            <input type="text" id="gh-repo" value="${this.repo}" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="repo-name">
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 0.3rem;">Personal Access Token</label>
                            <input type="password" id="gh-token" value="${this.token}" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="ghp_xxxxxxxxxxxx">
                        </div>
                        
                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button id="gh-cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: transparent; border-radius: 4px; cursor: pointer;">Cancel</button>
                            <button id="gh-save" style="padding: 0.5rem 1rem; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Save & Continue</button>
                        </div>
                    </div>
                </div>
            `;
            
            const div = document.createElement('div');
            div.innerHTML = modalHtml;
            document.body.appendChild(div);
            
            document.getElementById('gh-cancel').onclick = () => {
                document.body.removeChild(div);
                resolve(false);
            };
            
            document.getElementById('gh-save').onclick = () => {
                const o = document.getElementById('gh-owner').value.trim();
                const r = document.getElementById('gh-repo').value.trim();
                const t = document.getElementById('gh-token').value.trim();
                
                if (!o || !r || !t) {
                    alert('All fields are required.');
                    return;
                }
                
                this.saveCredentials(t, o, r);
                document.body.removeChild(div);
                resolve(true);
            };
        });
    }

    async pushFile(filePath, fileContent, commitMessage) {
        if (!this.hasCredentials()) {
            const configured = await this.promptForCredentials();
            if (!configured) return { success: false, error: 'GitHub credentials not provided.' };
        }

        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}`;
        
        try {
            // 1. Get current file SHA (if it exists)
            let sha = undefined;
            const getRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getRes.ok) {
                const data = await getRes.json();
                sha = data.sha;
            } else if (getRes.status !== 404) {
                const errData = await getRes.json();
                throw new Error(errData.message || 'Failed to fetch existing file details.');
            }

            // 2. Put new file content
            // Encode content to Base64 (supporting UTF-8)
            const b64Content = btoa(unescape(encodeURIComponent(fileContent)));
            
            const putBody = {
                message: commitMessage,
                content: b64Content
            };
            if (sha) putBody.sha = sha;

            const putRes = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putBody)
            });

            if (!putRes.ok) {
                const errData = await putRes.json();
                throw new Error(errData.message || 'Failed to commit file.');
            }

            return { success: true };

        } catch (error) {
            console.error('GitHub Push Error:', error);
            // If bad credentials, clear them so user is prompted again next time
            if (error.message.includes('Bad credentials')) {
                this.saveCredentials('', '', '');
            }
            return { success: false, error: error.message };
        }
    }
}

// Instantiate globally
window.githubCMS = new GitHubCMS();
