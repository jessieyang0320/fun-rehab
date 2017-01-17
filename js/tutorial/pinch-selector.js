


  // Global Variables for THREE.JS
  var camera, scene, renderer, container;

  // Global variable for leap
  var frame, controller;

  // Setting up how big we want the scene to be
  var sceneSize = 20;
  // Materials we will use for visual feedback
  var selectableHoverMaterial;
  var selectableNeutralMaterial;
  var selectableSelectedMaterial;

  var selectables = [];

  // Bool to tell if any selectables are currently
  // being interacted with. Kinda a crappy name. sry ;)
  var selectableSelected = false;

  var hoveredSelectable;


  // Number of selectable Objects in the field
  var numOfSelectables = 10;


  // Setting up a global variable for the pinch point,
  // and its strength.
  // In this case we will use palmPosition,
  // because it is the most stable when fingers move
  var pinchPoint, pinchStrength , oPinchStrength;

  // The cutoff for pinch strengths
  var pinchStrengthCutoff = .75;

  // How quickly the selected selectable will move to
  // the pinch point
  var movementStrength = .03;

  // Get everything set up
  init();

  // Start the frames rolling
  animate();


  function init(){

    controller = new Leap.Controller();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      50 ,
      window.innerWidth / window.innerHeight,
      sceneSize / 100 ,
      sceneSize * 4
    );

    // placing our camera position so it can see everything
    camera.position.z = sceneSize;

    // Getting the container in the right location
    container = document.createElement( 'div' );

    container.style.width      = '100%';
    container.style.height     = '100%';
    container.style.position   = 'absolute';
    container.style.top        = '0px';
    container.style.left       = '0px';
    container.style.background = '#000';

    document.body.appendChild( container );


    // Setting up our Renderer
    renderer = new THREE.WebGLRenderer();

    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );


    // Making sure our renderer is always the right size
    window.addEventListener( 'resize', onWindowResize , false );


    /*
      INITIALIZE AWESOMENESS!
    */
    initPinchPoint();
    initSelectables();
    initLights();

    controller.connect();


  }

  // Creates a pinch point for use to see,
  // That both contains a wireframe for constant
  // reference, and a globe that gets filled in
  // the more we pinch. Also, a light that
  function initPinchPoint(){

    var geo = new THREE.SphereGeometry(3, 16, 16);

    pinchPoint = new THREE.Mesh(
      geo,
      new THREE.MeshNormalMaterial({
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1
      })
    );


    pinchWireframe = new THREE.Mesh(
      geo,
      new THREE.MeshNormalMaterial({
        blending: THREE.AdditiveBlending,
        transparent: false,
        opacity: 1,
        wireframe: true
      })
    );

    var light = new THREE.PointLight( 0xffffff , 0.5 );

    pinchWireframe.position = pinchPoint.position;

    scene.add( pinchPoint );
    pinchPoint.add( pinchWireframe );
    pinchPoint.add( light );

  }

  function initLights(){

    var light = new THREE.DirectionalLight( 0xffffff , .5 );
    light.position.set( 0, 1 , 0 );
    scene.add( light );

  }


  // Creates our selectables, including 3 different materials
  // for the different states a selectable can be in
  function initSelectables(){

    selectableHoverMaterial = new THREE.MeshNormalMaterial({
      wireframe:false,
    });

    selectableNeutralMaterial = new THREE.MeshLambertMaterial({
      color:0xffffff,
      wireframe:true,
    });

    selectableSelectedMaterial = new THREE.MeshNormalMaterial();

    var geo = new THREE.IcosahedronGeometry( sceneSize / 20 , 2 );

    for( var i = 0; i < numOfSelectables; i++ ){


      var selectable = new THREE.Mesh( geo , selectableNeutralMaterial );

      selectable.position.x = ( Math.random() - .5 ) * sceneSize * 2;
      selectable.position.y = ( Math.random() - .5 ) * sceneSize * 2;
      selectable.position.z = ( Math.random() - .5 ) * sceneSize * 2;

      // Setting a vector which will be the diffrerence from
      // the pinch point to the selectable
      selectable.difference = new THREE.Vector3();
      selectable.distance   = selectable.difference.length();

      // Some booleans that will help us keep track of which
      // object is being interacted with
      selectable.hovered = false;
      selectable.selected = false;

      selectables.push( selectable );
      scene.add( selectable );

    }

  }

  // This function moves from a position from leap space,
  // to a position in scene space, using the sceneSize
  // we defined in the global variables section
  function leapToScene( position ){

    var x = position[0] - frame.interactionBox.center[0];
    var y = position[1] - frame.interactionBox.center[1];
    var z = position[2] - frame.interactionBox.center[2];

    x /= frame.interactionBox.size[0];
    y /= frame.interactionBox.size[1];
    z /= frame.interactionBox.size[2];

    x *= sceneSize;
    y *= sceneSize;
    z *= sceneSize;

    z -= sceneSize;

    return new THREE.Vector3( x , y , z );

  }


  function updatePinchPoint(){

    if( frame.hands[0] ){

      var hand = frame.hands[0];

      // First position pinch point
      pinchPoint.position = leapToScene( hand.palmPosition );

      oPinchStrength = pinchStrength;
      pinchStrength = hand.pinchStrength;

      // Makes our pinch point material opacity based
      // on pinch strength, to give use visual feedback
      // of how strong we are pinching
      pinchPoint.material.opacity = pinchStrength;
      pinchPoint.materialNeedsUpdate = true;

    }


  }

  /*

    There are many other ways to write this function,
    This one is created not for efficiency, but simply
    for using the most basic functionality ( AKA For Loops )
    I'll leave it as an excercise to the reader to make it
    better, possibly using arrays of 'selected objects'

  */
  function updateSelectables(){

    // First for loop is to figure out which
    // selectable is the closest
    for( var i = 0; i < selectables.length; i++ ){

      var selectable = selectables[i];

      selectable.difference.subVectors(
        selectable.position,
        pinchPoint.position
      );

      selectable.distance = selectable.difference.length();

    }

    // Make sure to only update our selectables
    // if there is not a selected object,
    // otherwise you might be selecting one object,
    // and than accidentally hover over another one....

    if( !selectableSelected ){

      var closestDistance = Infinity;
      var closestSelectable;

      // First for loop is to figure out which
      // selectable is the closest
      for( var i = 0; i < selectables.length; i++ ){

        if( selectables[i].distance < closestDistance ){

          closestSelectable = selectables[i];
          closestDistance   = selectables[i].distance;

        }

      }

      // Second for loop is to assign the proper 'hover'
      // status for each selectable
      for( var i = 0; i < selectables.length; i++ ){

        if( selectables[i] == closestSelectable ){
          if( !selectables[i].hovered ){
            selectables[i].hovered = true;
            selectables[i].material = selectableHoverMaterial;
            selectables[i].materialNeedsUpdate = true;
          }

        }else{
          if( selectables[i].hovered ){
            selectables[i].hovered = false;
            selectables[i].material = selectableNeutralMaterial;
            selectables[i].materialNeedsUpdate = true;
          }
        }

      }

    }

    // Pinch Start
    if(
      oPinchStrength < pinchStrengthCutoff &&
      pinchStrength >= pinchStrengthCutoff
    ){

      // If a selectable is hovered, make it selected,
      // and update its material
      for( var i = 0; i < selectables.length; i++ ){

        if( selectables[i].hovered ){

          selectables[i].selected = true;
          selectables[i].material = selectableSelectedMaterial;

          selectableSelected = true;
        }
      }
      console.log( 'Pinch Start' );

    // Pinch Stop
    }else if(
      oPinchStrength > pinchStrengthCutoff &&
      pinchStrength <= pinchStrengthCutoff
    ){

       for( var i = 0; i < selectables.length; i++ ){

        // If a selectable is selected, make it no longer selected
        if( selectables[i].selected ){

          selectables[i].selected = false;

          // Make sure that we are returning the selectable
          // to the proper material
          if( selectables[i].hovered ){
            selectables[i].material = selectableHoverMaterial;
          }else{
            selectables[i].material = selectableNeutralMaterial;
          }

          selectableSelected = false;

        }
      }

      console.log( 'Pinch Stop' );

    }


    for( var i = 0; i < selectables.length; i++ ){

      if( selectables[i].selected ){

        var force = selectables[i].difference.clone();
        force.multiplyScalar( movementStrength );

        selectables[i].position.sub( force );

      }


    }


  }

  // The magical update loop,
  // using the global frame data we assigned
  function update(){

    updatePinchPoint();
    updateSelectables();

  }


  function animate(){

    frame = controller.frame();

    update();

    renderer.render( scene , camera );

    requestAnimationFrame( animate );

  }


  function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

  }
