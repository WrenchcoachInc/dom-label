
import { domtoimage } from 'dom-to-image-more'


/** Class representing a label.
 * @extends DataImage
 */
class DOMLabel extends ZeaEngine.DataImage {
  /**
   * Create a label.
   * @param {string} name - The name value.
   * @param {any} library - The library value.
   */
  constructor(name, library) {
    super(name)

    // this.__canvasElem = document.createElement('canvas')
    const fontSize = 22

    const libraryParam = this.addParameter(new ZeaEngine.StringParameter('library'))
    this.addParameter(new ZeaEngine.StringParameter('Header', ''))
    this.addParameter(new ZeaEngine.StringParameter('Text', ''))
    // or load the label when it is loaded.

    // const setLabelTextToLibrary = ()=>{
    //     const library = libraryParam.getValue();
    //     const name = this.getName();
    //     const text = textParam.getValue();
    //     labelManager.setLabelTextToLibrary(library, name, text);
    // }
    // textParam.valueChanged.connect(setLabelText);

    this.addParameter(new ZeaEngine.ColorParameter('fontColor', new ZeaEngine.Color(0, 0, 0)))
    // this.addParameter(new ZeaEngine.StringParameter('textAlign', 'left'))
    // this.addParameter(MultiChoiceParameter('textAlign', 0, ['left', 'right']));
    // this.addParameter(new ZeaEngine.BooleanParameter('fillText', true))
    this.addParameter(new ZeaEngine.NumberParameter('margin', fontSize * 0.1))
    this.addParameter(new ZeaEngine.NumberParameter('width', 400))
    this.addParameter(new ZeaEngine.NumberParameter('borderWidth', 2))
    this.addParameter(new ZeaEngine.NumberParameter('borderRadius', fontSize * 0.5))
    this.addParameter(new ZeaEngine.BooleanParameter('outlineColor', new ZeaEngine.Color(0, 0, 0)))
    this.addParameter(
      new ZeaEngine.ColorParameter('backgroundColor', new ZeaEngine.Color('#FBC02D'))
    )
    this.addParameter(new ZeaEngine.NumberParameter('fontSize', 22))
    this.addParameter(new ZeaEngine.StringParameter('font', 'Verdana'))

    const reload = () => {
      this.loadLabelData()
    }
    this.nameChanged.connect(reload)

    if (library) libraryParam.setValue(library)

    this.__requestedRerender = true
    this.loadLabelData()
  }

  /**
   * This method can be overrridden in derived classes
   * to perform general updates (see GLPass or BaseItem).
   * @param {any} param - The param param.
   * @param {any} mode - The mode param.
   * @private
   */
  __parameterValueChanged(param, mode) {
    // if (!this.__requestedRerender) {
    //   this.__requestedRerender = true
      this.loadLabelData()
    // }
  }

  /**
   * The loadLabelData method.
   */
  loadLabelData() {
    const onLoaded = () => {
      this.__requestedRerender = false
      this.renderLabelToImage();
    }
    
    const loadText = () => {
      return new Promise(resolve => {
        const library = this.getParameter('library').getValue()
        if (library == '') {
          resolve()
          return
        }
        if (!ZeaEngine.labelManager.isLibraryFound(library)) {
          console.warn('Label Libary not found:', library)
          resolve()
          return
        }
        const getLibraryText = () => {
          try {
            const name = this.getName()
            // console.log("Text Loaded:" + name);
            const labelData = ZeaEngine.labelManager.getLabelText(library, name)
            this.getParameter('Header').setValue(labelData.Header)
            if (labelData.Text)
              this.getParameter('Text').setValue(labelData.Text)
          } catch (e) {
            // Note: if the text is not found in the labels pack
            // an exception is thrown, and we catch it here.
            console.warn(e)
          }
          resolve()
        }
        if (!ZeaEngine.labelManager.isLibraryLoaded(library)) {
          ZeaEngine.labelManager.labelLibraryLoaded.connect(loadedLibrary => {
            if (loadedLibrary == library) getLibraryText()
          })
        } else {
          getLibraryText()
        }
      })
    }
    const loadFont = () => {
      return new Promise(resolve => {
        if (document.fonts != undefined) {
          const font = this.getParameter('font').getValue()
          const fontSize = this.getParameter('fontSize').getValue()
          document.fonts.load(fontSize + 'px "' + font + '"').then(() => {
            // console.log("Font Loaded:" + font);
            resolve()
          })
        } else {
          resolve()
        }
      })
    }
    Promise.all([loadText(), loadFont()]).then(onLoaded)
    
  }

  /**
   * Renders the label text to a canvas element ready to display,
   */
  renderLabelToImage() {
    
    let header = this.getParameter('Header').getValue()
    let text = this.getParameter('Text').getValue()
    if (header == '') header = this.getName()

    const width = this.getParameter('width').getValue()
    const font = this.getParameter('font').getValue()
    const fontColor = this.getParameter('fontColor').getValue()
    const textAlign = 'center';//this.getParameter('textAlign').getValue()
    const fontSize = this.getParameter('fontSize').getValue()
    const margin = this.getParameter('margin').getValue()
    const borderWidth = this.getParameter('borderWidth').getValue()
    const borderRadius = this.getParameter('borderRadius').getValue()
    const outlineColor = this.getParameter('outlineColor').getValue()
    const backgroundColor = this.getParameter('backgroundColor').getValue()
    
    const div = document.createElement("div");
    div.style['text-align'] = textAlign
    div.style['font'] = `${fontSize}px ${font}`
    div.style['width'] = `${width}px`
    div.style['padding'] = `${margin}px`
    div.style['color'] = fontColor.toHex()
    div.style['background'] = backgroundColor.toHex()
    div.style['border'] = `${borderWidth}px solid`
    // div.style['border-radius'] = borderRadius
    div.style['border-radius'] = `${borderRadius}px`
    div.style['border-color'] = outlineColor.toHex()
    
    if (text) {
      div.innerHTML =`<h3>${header}</h3><p>${text}</p>`
    } else {
      div.innerHTML =`<h3>${header}</h3>`
    }

    document.body.appendChild(div)
    domtoimage.toPng(div)
      .then((dataUrl) => {
        var img = new Image();
        img.src = dataUrl;
        if (img.width > 0 && img.height > 0) {
          this.__data = img
          if (!this.__loaded) {
            this.__loaded = true
            this.loaded.emit()
          } else {
            this.updated.emit()
          }
        } else {
          // We often get errors trying to render labels and I'm not sure why.
          // Eventually they render.
          // console.warn('Unable to render Label:', this.getName());
        }
        document.body.removeChild(div)
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error);
      });
  }

  /**
   * The getParams method.
   * @return {any} - The return value.
   */
  getParams() {
    return super.getParams()
  }

  // ////////////////////////////////////////
  // Persistence

  /**
   * The toJSON method encodes this type as a json object for persistences.
   * @param {object} context - The context value.
   * @param {number} flags - The flags value.
   * @return {object} - Returns the json object.
   */
  toJSON(context, flags) {
    const j = super.toJSON(context, flags)
    return j
  }

  /**
   * The fromJSON method decodes a json object for this type.
   * @param {object} j - The json object this item must decode.
   * @param {object} context - The context value.
   * @param {number} flags - The flags value.
   */
  fromJSON(j, context, flags) {
    super.fromJSON(j, context, flags)
    this.__getLabelText()
  }
}

ZeaEngine.sgFactory.registerClass('DOMLabel', DOMLabel)

let state = {}

function createLabelAndLine(labelData) {
  const { basePos, offset, name, width, color } = labelData;
  const ballRadius = labelData.ballRadius ? labelData.ballRadius : 1
  const outlineColor = labelData.outlineColor ? labelData.outlineColor : new ZeaEngine.Color(0, 0, 0)

  let pos = labelData.pos;
  if (!pos) {
    pos = basePos.add(offset)
  }

  if (!state.labelLinesMaterial) {
    state.labelLinesMaterial = new ZeaEngine.Material('LabelLinesMaterial', 'HandleShader');
    state.labelLinesMaterial.getParameter('BaseColor').setValue(outlineColor)
  }
    
  if (!state.line) {
    const line = new ZeaEngine.Lines();
    line.setNumVertices(2);
    line.setNumSegments(1);
    line.setSegment(0, 0, 1);
    line.setVertex(1, new ZeaEngine.Vec3(1, 0, 0));
    state.line = line;
  }
  if (!state.ball) {
    state.ball = new ZeaEngine.Sphere(0.005);
  }

  const labelImage = new DOMLabel(name);
  labelImage.getParameter('library').setValue("servo_mestre")
  labelImage.getParameter('backgroundColor').setValue(color)
  labelImage.getParameter('outlineColor').setValue(outlineColor);
  labelImage.getParameter('fontSize').setValue(24);
  labelImage.getParameter('borderRadius').setValue(15);
  labelImage.getParameter('margin').setValue(1);
  if (width)
    labelImage.getParameter('width').setValue(width);

  const billboard = new ZeaEngine.BillboardItem('Label', labelImage);
  billboard.setLocalXfo(new ZeaEngine.Xfo(pos));
  billboard.getParameter('scale').setValue(0.15)
  billboard.getParameter('alignedToCamera').setValue(true);
  billboard.getParameter('alpha').setValue(1.0);

  const lineItem = new ZeaEngine.GeomItem('LabelLine', state.line, state.labelLinesMaterial);  
  
  
  const labelBallMaterial = new ZeaEngine.Material('LabelBallMaterial', 'HandleShader');
  // labelBallMaterial.replaceParameter(new ZeaEngine.ProxyParameter('BaseColor', labelLinesMaterial.getParameter('Color')))
  const ballColor = color.clone();
  ballColor.a = 0.85;
  labelBallMaterial.getParameter('BaseColor').setValue(ballColor)
  const ballItem = new ZeaEngine.GeomItem('LabelLineBall', state.ball, labelBallMaterial);
  const ballXfo = new ZeaEngine.Xfo()
  ballXfo.tr = basePos
  ballXfo.sc.set(ballRadius)
  ballItem.setLocalXfo(ballXfo);
  // billboard.addChild(ballItem, true);
  const aimOp = ZeaEngine.sgFactory.constructClass('AimOperator')
  aimOp.getParameter('Stretch').setValue(1.0)
  aimOp.replaceParameter(new ZeaEngine.ProxyParameter('Target', ballItem.getParameter('GlobalXfo')))
  aimOp.getOutputByIndex(0).setParam(lineItem.getParameter('GlobalXfo'))
  lineItem.addComponent(aimOp);

  billboard.addChild(lineItem, false);
  ballItem.addChild(billboard, true);

  ballItem.mouseDown.connect(()=>{
    ballColor.a = 0.15;
    labelBallMaterial.getParameter('BaseColor').setValue(ballColor)
  })

  return {
    billboard,
    ballItem
  }
}

export { DOMLabel, createLabelAndLine }
