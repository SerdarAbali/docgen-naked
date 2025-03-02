"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishToGitHub = publishToGitHub;
const rest_1 = require("@octokit/rest");
async function publishToGitHub({ repo, token, path, title, content }) {
    const octokit = new rest_1.Octokit({ auth: token });
    // Parse repo string
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        throw new Error('Invalid repository format. Use "owner/repo"');
    }
    // Ensure path ends with a slash if not empty
    const normalizedPath = path && !path.endsWith('/') ? `${path}/` : path;
    // Create sanitized filename
    const sanitizedTitle = title.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
    const filename = `${normalizedPath}${sanitizedTitle}.md`;
    try {
        // Check if file already exists
        let sha;
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo: repoName,
                path: filename,
            });
            if (!Array.isArray(data) && 'sha' in data) {
                sha = data.sha;
            }
        }
        catch (error) {
            // File doesn't exist, which is fine
        }
        // Create or update file
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo: repoName,
            path: filename,
            message: sha ? `Update ${title} documentation` : `Add ${title} documentation`,
            content: Buffer.from(content).toString('base64'),
            sha,
        });
        const fileUrl = `https://github.com/${owner}/${repoName}/blob/${response.data.commit.sha}/${filename}`;
        return { url: fileUrl };
    }
    catch (error) {
        console.error('GitHub API error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to publish to GitHub');
    }
}
