# How to Push the TypeScript Fix

Two scripts have been created to push the changes to GitHub. Choose based on your setup:

## Option 1: Windows Command Prompt (Easiest)

1. **Double-click** `push-changes.bat` in the project folder, OR
2. **Open Command Prompt** and run:
   ```cmd
   push-changes.bat
   ```

The script will:
- Configure git with your email/name
- Check current changes
- Add `src/lib/db.ts`
- Commit with message: "Fix TypeScript error: use inline type for getUserVideos return type"
- Push to the `main` branch on GitHub

## Option 2: Git Bash / Linux / Mac

1. **Open Git Bash** in the project folder, OR
2. **Open Terminal** and navigate to the project:
   ```bash
   cd ~/picklevision-pro
   ```

3. **Run the script:**
   ```bash
   bash push-changes.sh
   ```
   Or make it executable first:
   ```bash
   chmod +x push-changes.sh
   ./push-changes.sh
   ```

## What the Script Does

The script performs these steps:

1. **Configures Git** (if needed):
   - Email: `mgsinclair1979@gmail.com`
   - Name: `Martin Sinclair`

2. **Shows current status** - displays what files have changed

3. **Stages the file** - adds `src/lib/db.ts` to git

4. **Creates a commit** - with the message about fixing the TypeScript error

5. **Pushes to GitHub** - uploads to the `main` branch

## What Was Fixed

The `getUserVideos()` function in `src/lib/db.ts` was updated to use an explicit return type annotation with an inline type definition instead of referencing the `Video` interface. This resolves the TypeScript compilation error: "Cannot find name 'Video'".

### Before (caused compilation error):
```typescript
export async function getUserVideos(userId: string, limitCount: number = 10) {
  // ...
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (Video & { id: string })[];
}
```

### After (fixed):
```typescript
export async function getUserVideos(
  userId: string,
  limitCount: number = 10
): Promise<Array<{ id: string; userId: string; videoUrl: string; title?: string; uploadedAt: Timestamp }>> {
  // ...
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Array<{ id: string; userId: string; videoUrl: string; title?: string; uploadedAt: Timestamp }>;
}
```

## Troubleshooting

**Error: "git is not installed"**
- Install Git from: https://git-scm.com/

**Error: "Authentication failed"**
- Make sure your GitHub SSH key or personal access token is set up
- Try: `git config --global user.name "Your Name"`

**Error: "No changes to commit"**
- The file may have already been committed
- Check: `git status`

**Nothing happens after running the script**
- Try running from Git Bash instead of Command Prompt
- Or check if there are pending changes: `git status`
