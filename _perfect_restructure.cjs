const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const dirMoves = {
  'agent': 'core/orchestrator',
  'model': 'core/llm',
  'memory': 'core/memory',
  'components': 'interface/components',
  'commands': 'interface/commands',
  'cli.ts': 'interface/cli.ts',
  'theme.ts': 'interface/theme.ts',
  'index.tsx': 'interface/index.tsx',
  'tools': 'plugins/tools',
  'skills': 'plugins/workflows',
  'gateway': 'services/gateway',
  'cron': 'services/cron',
  'controllers': 'services/api',
  'utils': 'common/utils',
  'types.ts': 'common/types.ts',
  'providers.ts': 'common/providers.ts'
};

function getAllFiles(dir, fileList = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const originalFiles = getAllFiles(srcDir);

// Build map: old absolute path -> new absolute path
const fileMap = new Map();

for (const fp of originalFiles) {
  let relPath = path.relative(srcDir, fp).replace(/\\/g, '/');
  
  let newRelPath = relPath;
  for (const [oldPrefix, newPrefix] of Object.entries(dirMoves)) {
    if (relPath === oldPrefix || relPath.startsWith(oldPrefix + '/')) {
      newRelPath = relPath.replace(oldPrefix, newPrefix);
      break;
    }
  }
  
  const newAbsPath = path.join(srcDir, newRelPath);
  fileMap.set(fp.replace(/\\/g, '/'), { newAbsPath: newAbsPath.replace(/\\/g, '/'), newRelPath });
}

// Ensure unique mappings 
const knownBasenames = {}; // for fixing `@/` legacy imports

for (const [oldAbs, info] of fileMap.entries()) {
    let name = path.basename(info.newRelPath);  // e.g. 'cache.ts'
    let nameJs = name.replace(/\.ts$/, '.js').replace(/\.tsx$/, '.js');
    let dir = path.dirname(info.newRelPath); // e.g. 'common/utils'
    if (dir !== '.') {
       knownBasenames[nameJs] = dir + '/' + nameJs;
       knownBasenames[name] = dir + '/' + name;
    }
}

// 1. Process all file contents in memory BEFORE moving them!
const fileContents = new Map();

for (const fp of originalFiles) {
  const oldAbsPath = fp.replace(/\\/g, '/');
  const info = fileMap.get(oldAbsPath);
  
  let content = fs.readFileSync(fp, 'utf8');
  
  const oldDir = path.dirname(oldAbsPath); // e.g. /path/to/src/agent

  // Regex to match imports: (import|export ... from) ['"](.*?)['"]
  const importRegex = /(from\s+|import\s+)(['"])(.*?)\2/g;
  
  content = content.replace(importRegex, (match, prefix, quote, importStr) => {
    // If it's importing a standard lib or external package, leave it
    if (!importStr.startsWith('.') && !importStr.startsWith('@/')) {
        return match;
    }

    let resolvedOldAbsPath;
    let oldTargetNameJs = importStr;

    if (importStr.startsWith('@/')) {
        // e.g. '@/utils/cache.js'
        let mappedPortion = importStr.substring(2); 
        
        // Sometimes the old codebase had flat alias imports like `@/cache.js` missing their dir
        if (mappedPortion.indexOf('/') === -1 && knownBasenames[mappedPortion]) {
            mappedPortion = knownBasenames[mappedPortion];
        }

        resolvedOldAbsPath = path.join(srcDir, mappedPortion).replace(/\\/g, '/');
    } else {
        // Relative import like '../utils/cache.js'
        resolvedOldAbsPath = path.resolve(oldDir, importStr).replace(/\\/g, '/');
    }

    // Now we must find this target file in our mappings
    // However, imports often drop extensions or use .js instead of .ts
    let strippedTarget = resolvedOldAbsPath.replace(/\.js$/, '').replace(/\.ts$/, '').replace(/\.tsx$/, '');
    
    // Find the mapped new relative path for this target
    let targetNewRelPath = null;
    for (const [key, val] of fileMap.entries()) {
        let strippedKey = key.replace(/\.ts$/, '').replace(/\.tsx$/, '');
        if (strippedKey === strippedTarget || key === resolvedOldAbsPath || key + '.js' === resolvedOldAbsPath) {
            targetNewRelPath = val.newRelPath;
            break;
        }
    }

    if (targetNewRelPath) {
        // The file was moved. We will rewrite the import to an absolute @/ alias based on the NEW path
        // e.g. `common/utils/cache` + `.js`
        let newImportStr = '@/' + targetNewRelPath.replace(/\.ts$/, '.js').replace(/\.tsx$/, '.js');
        return `${prefix}${quote}${newImportStr}${quote}`;
    }

    // If it couldn't resolve against a known TS file, maybe it's just a folder index.
    // E.g. `../memory` matching `src/memory/index.ts`
    let indexTarget = strippedTarget + '/index';
    for (const [key, val] of fileMap.entries()) {
        let strippedKey = key.replace(/\.ts$/, '').replace(/\.tsx$/, '');
        if (strippedKey === indexTarget) {
            let newDir = path.dirname(val.newRelPath);
            targetNewRelPath = newDir; 
            break;
        }
    }

    if (targetNewRelPath) {
        let newImportStr = '@/' + targetNewRelPath;
        return `${prefix}${quote}${newImportStr}${quote}`;
    }

    // If not found, leave it as is
    return match;
  });

  fileContents.set(info.newAbsPath, content);
}

// 2. Perform the restructure on the FS
// Create all target directories first
for (const [oldAbs, info] of fileMap.entries()) {
   fs.mkdirSync(path.dirname(info.newAbsPath), { recursive: true });
}

// Move files or just overwrite them in the new locations, then delete old ones 
// Since some new paths overlap old paths (e.g. they both are inside src), it's safer to just write new files, then delete any empty/old dirs.

// Let's delete the old files entirely
for (const fp of originalFiles) {
    fs.unlinkSync(fp);
}

// Write the new files
for (const [newAbsPath, content] of fileContents.entries()) {
    fs.writeFileSync(newAbsPath, content, 'utf8');
}

console.log('Restructure and AST-safe import rewrite complete.');
