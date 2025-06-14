
export function addGuiObjectInFolder(gui, folderName, obj, attributes) {
    const folder = gui.addFolder(folderName);
    attributes.forEach(attr => {
      const parts = attr.split('.');
      if (parts.length === 2) {
        folder.add(obj[parts[0]], parts[1]);
      } else {
        folder.add(obj, attr);
      }
    });
    return folder;
  }
  