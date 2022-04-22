import * as fs from 'fs';
import * as path from 'path';

type IManifestComponent = Omit<
  IManifest,
  'author' | 'license' | 'readme' | 'components'
> & { path: string };

interface IManifest {
  description: string;
  image: string;
  name: string;
  title: string;
  version: string;

  author: string;
  license: string;
  readme: string;
  components: IManifestComponent[];
}

class PluginManifest {
  constructor(
    public name: string,
    public title: string,
    public version: string,
    public description: string,
    public readme: string,
    public image: string,
    public author: string,
    public license: string,
    public components: ComponentManifest[] = []
  ) {
    if (!name) throw new Error(`PluginManifest: Name is not defined!`);
    if (!title) throw new Error(`PluginManifest => ${this.name}: Title is not defined!`);
    if (!version) throw new Error(`PluginManifest => ${this.name}: Version is not defined!`);
    if (!description)
      throw new Error(`PluginManifest => ${this.name}: Description is not defined!`);
    if (!readme) throw new Error(`PluginManifest => ${this.name}: Readme is not defined!`);
    if (!author) throw new Error(`PluginManifest => ${this.name}: Author is not defined!`);
    if (!license) this.license = 'MIT';
  }
}

class ComponentManifest {
  constructor(
    public name: string,
    public title: string,
    public version: string,
    public description: string = 'Component',
    public path: string,
    public image: string
  ) {
    if (!name) throw new Error('ComponentManifest: Name is not defined!');
    if (!title) throw new Error(`ComponentManifest => ${this.name}: Title is not defined!`);
    if (!version) throw new Error(`ComponentManifest => ${this.name}: Version is not defined!`);
    if (!description) this.description = '';
    if (!path) throw new Error(`ComponentManifest => ${this.name}: Path is not defined!`);
    if (path && !this.isHasExtension(path, '.ts')) throw new Error(`ComponentManifest => ${this.name}: Path doesn't have extension!`);
    if (path && !ensureDir(path)) throw new Error(`ComponentManifest => ${this.name}: File ${this.path} doesn't exist!`);
    if (!path) throw new Error(`ComponentManifest => ${this.name}: Path is not defined!`);
  }

  isHasExtension(path: string, ext: string): boolean {
    return path.includes(ext);
  }
}

const checkIsDirectory = (path: string): boolean => {
  return fs.lstatSync(path).isDirectory();
};

const readDir = (dir: string, collector: string[]) => {
  if (!ensureDir(dir)) throw new Error(`Dir: ${dir} doesn't exist!`);
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(dir, filename);
    if (checkIsDirectory(filePath)) {
      readDir(filePath, collector);
    } else {
      if (isManifest(filePath)) {
        collector.push(filePath);
      }
    }
  }
  return collector;
};

const isManifest = (dir: string): boolean => {
  return dir.includes('manifest.json');
};

const ensureDir = (dir: string): boolean => {
  if (fs.existsSync(dir)) {
    return true;
  } else {
    return false;
  }
};

const readJson = (dir: string): string => {
  try {
    const manifest = fs.readFileSync(dir);
    return manifest.toString();
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

const collectManifests = (dir: string): IManifest[] => {
  const collector: IManifest[] = [];
  const manifestDirs = readDir(dir, []);
  for (let manifest of manifestDirs) {
    const {
      author,
      components,
      description,
      image,
      license,
      name,
      readme,
      title,
      version,
    }: IManifest = JSON.parse(readJson(manifest));
    const newComponentManifests = components.map(
      ({
        description,
        image,
        name,
        path,
        version,
        title,
      }: IManifestComponent) =>
        new ComponentManifest(name, title, version, description, path, image)
    );
    const newManifest = new PluginManifest(
      name,
      title,
      version,
      description,
      readme,
      image,
      author,
      license,
      newComponentManifests
    );
    collector.push(newManifest);
  }
  return collector;
};

const createManifestJson = (collector: IManifest[], dir: string): void => {
  fs.writeFileSync(
    `${dir}/manifests.json`,
    JSON.stringify({ manifests: collector })
  );
}

const createMarketplaceMap = (collector: IManifest[]): {[T: string]: string}[] => {
  const components = collector.map(manifest => manifest.components).flat()
  const componentsMap = components.reduce((acc: string, component, idx, array) => {
    const isLastElement = idx + 1 === array.length;
    if (!isLastElement) {
      return acc + `"${component.name}": "${component.path}",`
    } else {
      return acc + `"${component.name}": "${component.path}"`
    }
  }, '')
  return JSON.parse(`{${componentsMap}}`);
}

module.exports.collectManifests = collectManifests;
module.exports.createManifestJson = createManifestJson;
module.exports.createMarketplaceMap = createMarketplaceMap;
