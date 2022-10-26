import '../App.css'
import React, { useEffect, useState} from 'react'
import {Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup} from '@mui/material'
import LoadSelector from '../components/LoadSelector'
import AddEditForm from '../components/AddEditForm'
import {HorizontalGridLines, LabelSeries, LineSeries, VerticalGridLines, XAxis, XYPlot, YAxis} from "react-vis"


function CombinedLoadApp(){

    const butStyle = {background: "black", height:window.innerHeight/12,
        width:window.innerWidth/10 ,borderRadius: 8, color: "white"}
    const [beamProperties,setBeamProperties] = useState({length: 100, elasticity: 1.0, inertia: 1.0, density: 1.0, area: 1.0, dampingRatio:0.02, rA: 85000.0, EI: 210000000000.0, gravity:9.8})
    const [supportProperties,setSupportProperties] = useState({type: "Simply Supported", leftSupportPos: 0, rightSupportPos: 100})
    const [isBeamIni, setIsBeamIni] = useState(false)
    const [loads,setLoads] = useState({})
    const [selectedLoad, setSelectedLoad] = useState('load1')
    const [loadUpdated, setLoadUpdated] = useState(false)
    const [newLoadData, setNewLoadData] = useState({name:loadNamer(loads), type:"Point", location:beamProperties.length / 2, mass:10.0, length:0, tallerEnd: "Left", color:"#00000080"})
    const [openAddEdit, setOpenAddEdit] = useState(false);
    const [addEditMode, setAddEditMode] = useState("Add");
    const [initialFormWarning, setInitialFormWarning] = useState("");
    const [addEditFormWarning, setAddEditFormWarning] = useState("");
    const [hideLengthField, setHideLengthField] = useState(true);
    const [hideTallerEndField, setHideTallerEndField] = useState(true);
    const [deflectionScale, setDeflectionScale] = useState(1);
    const [bendingMomentScale, setBendingMomentScale] = useState(1);
    const [shearForceScale, setShearForceScale] = useState(1);

    // Function that automatically re-renders the screen.
    const [render, setRender] = useState(true);
    function reRender() {
        setRender(!render)
    }
    
    // Function that automatically resets the focus on the page so users can use keyboard controls.
    const initialFormRef = React.useRef(null)
    const plotScreenRef = React.useRef(null)
    function reFocus() {
        if(!isBeamIni)
            initialFormRef.current.focus()
        else
            plotScreenRef.current.focus()
    }

    // This makes the XYPlots automatically scale when the user resizes the window.
    useEffect(() => {
        window.addEventListener("resize", reRender)
        return () => window.removeEventListener("resize", reRender)
    },[window.innerHeight, window.innerWidth]);

    // Function allowing users to submit forms by pressing Enter, or use the left, jump, and right features by pressing Arrow keys.
    function handleKeyDown(event){
        // On the Add/Edit form
        if(openAddEdit){
            // Enter key
            if(event.keyCode == 13) {
                handleCloseAddEdit("confirm", addEditMode)
                event.preventDefault()
            }
        }
        // On the initial form screen
        else if(!isBeamIni) {
            // Enter key
            if(event.keyCode == 13)
                handleSubmit(beamProperties, null)
        }
        // On the main plots screen
        else {
            // Prevent arrow keys from scrolling the screen
            if([37,38,39,40].includes(event.keyCode))
                event.preventDefault()
            // Left arrow key
            if(event.keyCode == 37)
                playerMovement(-1,1,10)
            // Up arrow key (Jump)
            else if(event.keyCode == 38)
                playerMovement(0,5,10)
            // Right arrow key
            else if(event.keyCode == 39)
                playerMovement(1,1,10)
        }
    }
    
    // When submitting the initial form
    function handleSubmit(data, e){
        validateInputsInitialForm();
        if(initialFormWarning === "") {
            setBeamProperties(data);
            setIsBeamIni(true);
            reRender()
            reFocus()
        } 
        else if(e != null)
            e.preventDefault();
    }

    // When Add Load button is clicked
    const handleClickAdd = () => {
        // Pick a random color in the range #000000 to #9F9F9F, always opacity 50%.
        let newR = Math.floor(Math.random() * 160).toString(16);
        if(newR.length < 2)
            newR = "0"+newR;
        let newG = Math.floor(Math.random() * 160).toString(16);
        if(newG.length < 2)
            newG = "0"+newG;
        let newB = Math.floor(Math.random() * 160).toString(16);
        if(newB.length < 2)
            newB = "0"+newB;
        let color = "#" + newR + newG + newB + "80";

        // Put default load properties.
        setNewLoadData({name:loadNamer(loads), type:"Point", location:beamProperties.length / 2, mass:10.0, length:0, tallerEnd: "Left", color:color});
        setHideLengthField(true);
        setHideTallerEndField(true);
        // Display menu.
        setOpenAddEdit(true);
        setAddEditMode("Add");
    };

    // When Edit Load button is clicked
    const handleClickEdit = () => {
        // Put preexisting load properties.
        setNewLoadData({name:selectedLoad, type:loads[selectedLoad].type, location:loads[selectedLoad].location + loads[selectedLoad].length / 2, mass:loads[selectedLoad].mass, length:loads[selectedLoad].length, tallerEnd:loads[selectedLoad].tallerEnd, color:loads[selectedLoad].color});
        setHideLengthField(loads[selectedLoad].type === "Point");
        setHideTallerEndField(loads[selectedLoad].type !== "Triangular")
        // Display menu.
        setOpenAddEdit(true);
        setAddEditMode("Edit");
    };

    // When closing the Add/Edit Load menu by clicking out, canceling, or confirming.
    function handleCloseAddEdit (event, mode) {
        // If user clicked out or cancelled, do nothing and close the form.
        if(event !== "confirm"){
            setOpenAddEdit(false)
            setAddEditFormWarning("")
            reRender()
            reFocus()
            return
        }
        // Check if errors are present, do nothing.
        validateInputsAddEditForm(mode)
        if(addEditFormWarning !== "")
            return;

        // Erase unused properties for the given load type.
        if(newLoadData.type === "Point")
            newLoadData.length = 0
        if(newLoadData.type !== "Triangular")
            newLoadData.tallerEnd = "Left"
        // Create the new load if this is adding mode.
        if(mode === "Add")
            loads[newLoadData.name] = {type:newLoadData.type, location:(newLoadData.location - newLoadData.length / 2), mass:newLoadData.mass, length:newLoadData.length, tallerEnd:newLoadData.tallerEnd, color:newLoadData.color}
        // Edit existing load if this is editing mode.
        else {
            // This for-loop is used to preserve the ordering of the loads in the list, instead of moving the edited load to the end.
            for(let load in loads) {
                if(load !== selectedLoad) {
                    let type = loads[load].type
                    let location = loads[load].location
                    let mass = loads[load].mass
                    let length = loads[load].length
                    let tallerEnd = loads[load].tallerEnd
                    let color = loads[load].color
                    delete loads[load]
                    loads[load] = {type:type, location:location, mass:mass, length:length, tallerEnd:tallerEnd, color:color}
                }
                else {
                    delete loads[load]
                    loads[newLoadData.name] = {type:newLoadData.type, location:(newLoadData.location - newLoadData.length / 2), mass:newLoadData.mass, length:newLoadData.length, tallerEnd:newLoadData.tallerEnd, color:newLoadData.color}
                }
            }
        }
        setSelectedLoad(newLoadData.name)
        setOpenAddEdit(false)
        setAddEditFormWarning("")
        reRender()
        reFocus()
    }

    // When Delete Load button is clicked
    function deleteLoad(){
        delete loads[selectedLoad]

        // Switch selectedLoad to the first available load
        for(let load in loads){
            setSelectedLoad(load)
            break
        }

        reRender()
        reFocus()
    }
 
    // When Edit Beam Properties button is clicked
    function handleReturnButton() {
        setIsBeamIni(false)
        reRender()
        reFocus()
    }

    /**
     * This function checks the initial form inputs to ensure that they are valid. 
     * All inputs must be nonnegative numbers. Beam length and EI must be nonzero. 
     * Load location must be less than or equal to beam length.
     * This function also converts the string inputs into number inputs.
     */
     function validateInputsInitialForm(){
        // Check that length is a number > 0.
        if(parseFloat(beamProperties.length) != beamProperties.length){
            setInitialFormWarning("Length of Beam must be a number.");
            return;
        }
        beamProperties.length = Number(beamProperties.length);
        if(beamProperties.length <= 0) {
            setInitialFormWarning("Length of Beam must be greater than 0.");
            return;
        }

        // Check that elasticity is a number >= 0
        if(parseFloat(beamProperties.elasticity) != beamProperties.elasticity){
            setInitialFormWarning("Elasticity must be a number.");
            return;
        }
        beamProperties.elasticity = Number(beamProperties.elasticity);
        if(beamProperties.elasticity < 0) {
            setInitialFormWarning("Elasticity must be at least 0.");
            return;
        }

        // Check that inertia is a number >= 0.
        if(parseFloat(beamProperties.inertia) != beamProperties.inertia){
            setInitialFormWarning("Inertia must be a number.");
            return;
        }
        beamProperties.inertia = Number(beamProperties.inertia);
        if(beamProperties.inertia < 0) {
            setInitialFormWarning("Inertia must be at least 0.");
            return;
        }

        // Check that density is a number >= 0.
        if(parseFloat(beamProperties.density) != beamProperties.density){
            setInitialFormWarning("Density must be a number.");
            return;
        }
        beamProperties.density = Number(beamProperties.density);
        if(beamProperties.density < 0) {
            setInitialFormWarning("Density must be at least 0.");
            return;
        }

        // Check that area is a number >= 0.
        if(parseFloat(beamProperties.area) != beamProperties.area){
            setInitialFormWarning("Area must be a number.");
            return;
        }
        beamProperties.area = Number(beamProperties.area);
        if(beamProperties.area < 0) {
            setInitialFormWarning("Area must be at least 0.");
            return;
        }


        // Check that damping ratio is a number >= 0.
        if(parseFloat(beamProperties.dampingRatio) != beamProperties.dampingRatio){
            setInitialFormWarning("Damping Ratio must be a number.");
            return;
        }
        beamProperties.dampingRatio = Number(beamProperties.dampingRatio);
        if(beamProperties.dampingRatio < 0) {
            setInitialFormWarning("Damping Ratio must be at least 0.");
            return;
        }


        // Check that rA is a number >= 0.
        if(parseFloat(beamProperties.rA) != beamProperties.rA){
            setInitialFormWarning("rA must be a number.");
            return;
        }
        beamProperties.rA = Number(beamProperties.rA);
        if(beamProperties.rA < 0) {
            setInitialFormWarning("rA must be at least 0.");
            return;
        }

        // Check that EI is a number > 0.
        if(parseFloat(beamProperties.EI) != beamProperties.EI){
            setInitialFormWarning("EI must be a number.");
            return;
        }
        beamProperties.EI = Number(beamProperties.EI);
        if(beamProperties.EI <= 0) {
            setInitialFormWarning("EI must be greater than 0.");
            return;
        }

        // Check that gravity is a number >= 0.
        if(parseFloat(beamProperties.gravity) != beamProperties.gravity){
            setInitialFormWarning("Gravity must be a number.");
            return;
        }
        beamProperties.gravity = Number(beamProperties.gravity);
        if(beamProperties.gravity < 0) {
            setInitialFormWarning("Gravity must be at least 0.");
            return;
        }

        // Check that left support loc is a number >= 0 and <= beam length.
        if(parseFloat(supportProperties.leftSupportPos) != supportProperties.leftSupportPos){
            setInitialFormWarning("Left Support Position must be a number.")
            return;
        }
        supportProperties.leftSupportPos = Number(supportProperties.leftSupportPos);
        if(supportProperties.leftSupportPos < 0) {
            setInitialFormWarning("Left Support Position must be at least 0.")
            return;
        }
        if(supportProperties.leftSupportPos > beamProperties.length) {
            setInitialFormWarning("Left Support Position must be less than or equal to Length of Beam.");
            return;
        }

        // Check that right support loc is a number >= 0 and <= beam length.
        if(parseFloat(supportProperties.rightSupportPos) != supportProperties.rightSupportPos){
            setInitialFormWarning("Right Support Position must be a number.")
            return;
        }
        supportProperties.rightSupportPos = Number(supportProperties.rightSupportPos);
        if(supportProperties.rightSupportPos < 0) {
            setInitialFormWarning("Right Support Position must be at least 0.")
            return;
        }
        if(supportProperties.rightSupportPos > beamProperties.length) {
            setInitialFormWarning("Right Support Position must be less than or equal to Length of Beam.");
            return;
        }

        // Check that created loads are not invalidated by length of beam change.
        for(let load in loads)
            if(loads[load].type === "Point" && loads[load].location > beamProperties.length) {
                setInitialFormWarning(load + " location must be less than or equal to Length of Beam.");
                return;
            }
            else if(loads[load].type !== "Point" && loads[load].location + loads[load].length > beamProperties.length) {
                setInitialFormWarning("Right end of " + load + " is out of bounds (Location is " + (loads[load].location + loads[load].length) + ", must be less than or equal to Length of Beam).");
                return;
            }
        
        // No errors.
        setInitialFormWarning("");
    }

    /**
     * This function checks the initial form inputs to ensure that they are valid. 
     * All inputs must be nonnegative numbers. Beam length and EI must be nonzero. 
     * Load location must be less than or equal to beam length.
     * This function also converts the string inputs into number inputs.
     */
     function validateInputsAddEditForm(mode){
        reRender();
        // Check that name is not in use, unless when editing if the name is the same as the original name.
        if((newLoadData.name in loads) && (mode === "Add" || newLoadData.name !== selectedLoad)) {
            setAddEditFormWarning("Name is already in use.");
            return;
        }

        setHideLengthField(newLoadData.type === "Point");
        setHideTallerEndField(newLoadData.type !== "Triangular")

        // Check that location is a number.
        if(parseFloat(newLoadData.location) != newLoadData.location){
            setAddEditFormWarning("Location must be a number.");
            return;
        }
        newLoadData.location = Number(newLoadData.location);

        // Check that mass is a number >= 0.
        if(parseFloat(newLoadData.mass) != newLoadData.mass){
            setAddEditFormWarning("Mass must be a number.");
            return;
        }
        newLoadData.mass = Number(newLoadData.mass);
        if(newLoadData.mass < 0) {
            setAddEditFormWarning("Mass must be at least 0.");
            return;
        }

        // Check that length is a number >= 0.
        if(parseFloat(newLoadData.length) != newLoadData.length){
            setAddEditFormWarning("Length must be a number.");
            return;
        }
        newLoadData.length = Number(newLoadData.length);
        if(newLoadData.length < 0) {
            setAddEditFormWarning("Length must be at least 0.");
            return;
        }

        // Check that load location is in-bounds, for point load.
        if(newLoadData.type === "Point") {
            if(newLoadData.location < 0) {
                setAddEditFormWarning("Location must be at least 0.");
                return;
            }
            if(newLoadData.location > beamProperties.length) {
                setAddEditFormWarning("Location must be less than or equal to Length of Beam.");
                return;
            }
        }
        // Check that left and right ends of the load are in-bounds, for long loads.
        else {
            // While the form is open, newLoadData.location refers to the middle of the load instead of the left end.
            let leftEnd = newLoadData.location - newLoadData.length / 2;
            let rightEnd = newLoadData.location + newLoadData.length / 2;
            if(leftEnd < 0) {
                setAddEditFormWarning("Left end of load is out of bounds (Location is " + leftEnd + ", must be at least 0).");
                return;
            }
            if(rightEnd > beamProperties.length){
                setAddEditFormWarning("Right end of load is out of bounds (Location is " + rightEnd + ", must be less than or equal to Length of Beam).");
                return;
            }
        }

        // No errors.
        setAddEditFormWarning("");
    }

    // When using the load selector dropdown or initial form radio buttons to change selected load
    function handleSelectedChange(event){
        setSelectedLoad(event.target.value);
        reRender()
    }

    // When clicking an arrow, line, or label corresponding to a load to change selected load
    function handleLoadClick(element){
        setSelectedLoad(element.loadID)
        reRender()
    }

    // Move the selected load
    function playerMovement(disp,mag,tl){
        if(!(selectedLoad in loads)){
            return
        }
        let newLoc = loads[selectedLoad].location + disp
        // Constrain newLoc to be in-bounds
        newLoc = Math.max(newLoc, 0)
        newLoc = Math.min(newLoc, beamProperties.length - loads[selectedLoad].length)
        loads[selectedLoad].location = newLoc
        reRender()
    }
    
    // Returns LineSeries plot points for deflection diagram. Also updates the scale for the plot.
    function deflectionDiagram() {
        // Get data points for deflection plot
        let plotData = plotSum(deflectionSingleLoad, loads, beamProperties, supportProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != deflectionScale)
            setDeflectionScale(newScale)

        return plotData
    }

    // Returns LineSeries plot points for bending moment diagram. Also updates the scale for the plot.
    function bendingMomentDiagram() {
        // Get data points for bending moment plot
        let plotData = plotSum(bendingMomentSingleLoad, loads, beamProperties, supportProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != bendingMomentScale)
            setBendingMomentScale(newScale)

        return plotData
    }

    // Returns LineSeries plot points for shear force diagram. Also updates the scale for the plot.
    function shearForceDiagram() {
        // Get data points for shear force plot
        let plotData = plotSum(shearForceSingleLoad, loads, beamProperties, supportProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != shearForceScale)
            setShearForceScale(newScale)

        console.log(plotData)
        return plotData
    }
    
    // Display the initial inputs form
    if(!isBeamIni){
        return(
            <form ref={initialFormRef} onKeyDown={handleKeyDown} tabIndex="0" onSubmit={(e)=> {handleSubmit(beamProperties, e)}}>
                <h1>CARL</h1>
                {/* Enter beam properties in the initial form */}
                <h3 style={{marginBottom: 0}}>Beam Properties</h3>
                <div>
                    <label>Length of Beam:
                        <input
                            defaultValue={beamProperties.length}
                            type="text"
                            onChange={(e) => {
                                beamProperties.length = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Elasticity:
                        <input
                            defaultValue={beamProperties.elasticity}
                            type="text"
                            onChange={(e) => {
                                beamProperties.elasticity = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Inertia:
                        <input
                            defaultValue={beamProperties.inertia}
                            type="text"
                            onChange={(e) => {
                                beamProperties.inertia = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Density:
                        <input
                            defaultValue={beamProperties.density}
                            type="text"
                            onChange={(e) => {
                                beamProperties.density = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Area:
                        <input
                            defaultValue={beamProperties.area}
                            type="text"
                            onChange={(e) => {
                                beamProperties.area = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Damping Ratio:
                        <input
                            defaultValue={beamProperties.dampingRatio}
                            type="text"
                            onChange={(e) => {
                                beamProperties.dampingRatio = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>rA:
                        <input
                            defaultValue={beamProperties.rA}
                            type="text"
                            onChange={(e) => {
                                beamProperties.rA = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>EI:
                        <input
                            defaultValue={beamProperties.EI}
                            type="text"
                            onChange={(e) => {
                                beamProperties.EI = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Gravity:
                        <input
                            defaultValue={beamProperties.gravity}
                            type="text"
                            onChange={(e) => {
                                beamProperties.gravity = e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    {/* Support type radio button selection */}
                    <FormControl sx={{marginTop:1}}>
                        <h3 style={{marginBottom: 0}}>Support Properties</h3>
                        <RadioGroup
                            row
                            value={supportProperties.type}
                            onChange={(val)=>{
                                supportProperties.type = val.target.value;
                                validateInputsInitialForm();
                                reRender();
                            }}
                        >
                            <FormControlLabel value="Simply Supported" control={<Radio />} label="Simply Supported" />
                            <FormControlLabel value="Cantilever" control={<Radio />} label="Cantilever" />
                        </RadioGroup>
                    </FormControl>
                    <div></div>
                    <label>Left Support Position:
                        <input
                            defaultValue={supportProperties.leftSupportPos}
                            disabled={supportProperties.type !== "Simply Supported"}
                            type="text"
                            onChange={(e)=>{
                                supportProperties.leftSupportPos=e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                    <div></div>
                    <label>Right Support Position:
                        <input
                            defaultValue={supportProperties.rightSupportPos}
                            disabled={supportProperties.type !== "Simply Supported"}
                            type="text"
                            onChange={(e)=>{
                                supportProperties.rightSupportPos=e.target.value
                                validateInputsInitialForm();
                            }}
                        />
                    </label>
                </div>
                <p></p>
                <div>
                    {/* Load list with radio button selection */}
                    <h3 style={{marginBottom: 0}}>List of Loads</h3>
                    <RadioGroup
                        name="loadSelectionRadioBtns"
                        value={selectedLoad}
                        onChange={handleSelectedChange}
                        sx={{display:'inline-flex'}}
                    >
                        {loadRadioButtonsCreator(loads)}
                    </RadioGroup>
                    <div>
                        {/* Add, Edit, Delete Load buttons */}
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickAdd}>Add Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickEdit} disabled={Object.keys(loads).length === 0}>Edit Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={deleteLoad} disabled={Object.keys(loads).length === 0}>Delete Load</Button>
                        {/* Add/Edit Load menu */}
                        <AddEditForm
                            open={openAddEdit} 
                            mode={addEditMode}
                            handleClose={handleCloseAddEdit}
                            newLoadData={newLoadData}
                            validate={validateInputsAddEditForm}
                            warningText={addEditFormWarning}
                        />
                    </div>
                </div>
                {/* Text display for invalid inputs. */}
                <p style={{fontWeight: 'bold'}}>{initialFormWarning}</p>
                {/* Submit button. */}
                <input type="submit" value="Analyze"/>
            </form>
        );
    }
    return(
        <div className={"rowC"} ref={plotScreenRef} onKeyDown={handleKeyDown} tabIndex="0">
            <div>
                <h1>CARL</h1>
                {/* Main Plot */}
                <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain={[-100, 100]} margin={{left: 10}}>
                    <VerticalGridLines/>
                    <HorizontalGridLines/>
                    <XAxis tickFormat={formatVal(beamProperties.length)} title = {"Load Location"}/>
                    <YAxis/>
                    {/* Display the beam. */}
                    <LineSeries data = {[{x: 0, y: 0}, {x: beamProperties.length, y: 0}]} />
                    {/* Display the supports. */}
                    <LabelSeries data={[{x: supportProperties.leftSupportPos, y: -11, label: "\u25b2", style: {fontSize: 25, font: "verdana", fill: "#12939A", dominantBaseline: "text-after-edge", textAnchor: "middle"}},
                                        {x: supportProperties.rightSupportPos, y: -11, label: "\u2b24", style: {fontSize: 25, font: "verdana", fill: "#12939A", dominantBaseline: "text-after-edge", textAnchor: "middle"}}]} />
                    {/* Display the loads. */}
                    <LabelSeries data={labelMakerForLoads(loads,selectedLoad,beamProperties)} onValueClick={handleLoadClick} />
                    {/* Display the line parts of distributed and triangular loads. */}
                    {Object.entries(loads).map((load) => {
                        // Distributed load line
                        if(load[1].type==="Distributed")
                            return (
                                <LineSeries 
                                    color={load[1].color}
                                    strokeWidth={3}
                                    data={[{x: load[1].location, y: 8}, {x: (load[1].location+load[1].length), y: 8}]}
                                    onSeriesClick={(event) => {setSelectedLoad(load[0])}}
                                    key={load.toString()}
                                />
                            )
                        // Triangular load lines
                        else if(load[1].type==="Triangular") {
                            // Left-taller triangle
                            if(load[1].tallerEnd==="Left")
                                return (
                                    <LineSeries
                                        color={load[1].color}
                                        strokeWidth={3}
                                        data={[{x: load[1].location, y: 8}, {x: load[1].location, y: 20}, {x: (load[1].location+load[1].length), y: 8}, {x: load[1].location, y: 8}]}
                                        onSeriesClick={(event) => {setSelectedLoad(load[0])}}
                                        key={load.toString()}
                                    />
                                )
                            // Right-taller triangle
                            else
                                return (
                                    <LineSeries
                                        color={load[1].color}
                                        strokeWidth={3}
                                        data={[{x: load[1].location, y: 8}, {x: (load[1].location+load[1].length), y: 20}, {x: (load[1].location+load[1].length), y: 8}, {x: load[1].location, y: 8}]}
                                        onSeriesClick={(event) => {setSelectedLoad(load[0])}}
                                        key={load.toString()}
                                    />
                                )
                        }
                    })}
                </XYPlot>
                {/* Load Selection dropdown */}
                <LoadSelector loadList={loads} value={selectedLoad} onChange={handleSelectedChange} />
                <div>
                    {/* Add, Edit, Delete Load buttons */}
                    <Button variant="outlined" sx={{width:135}} onClick={handleClickAdd}>Add Load</Button>
                    <Button variant="outlined" sx={{width:135}} onClick={handleClickEdit} disabled={Object.keys(loads).length === 0}>Edit Load</Button>
                    <Button variant="outlined" sx={{width:135}} onClick={deleteLoad} disabled={Object.keys(loads).length === 0}>Delete Load</Button>
                    {/* Add/Edit Load menu */}
                    <AddEditForm
                        open={openAddEdit} 
                        mode={addEditMode}
                        handleClose={handleCloseAddEdit}
                        newLoadData={newLoadData}
                        validate={validateInputsAddEditForm}
                        warningText={addEditFormWarning}
                    />
                </div>
                <div>
                    {/* Control buttons */}
                    <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{playerMovement(-1,1,10)}}>&#8592;</Button>
                    <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{playerMovement(0,5,10)}}>JUMP</Button>
                    <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{playerMovement(1,1,10)}}>&#8594;</Button>
                </div>
                <Button variant="contained" sx={{margin:0.5}} onClick={()=>handleReturnButton()}>Edit Beam Properties</Button>
            </div>
            <div>
                <h1>Plots</h1>
                {/* Side plots */}
                {/* Deflection Diagram */}
                <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain = {[deflectionScale, deflectionScale]} margin = {{left : 60, right:60}}>
                    <VerticalGridLines/>
                    <HorizontalGridLines/>
                    <XAxis tickFormat = {formatVal(beamProperties.length)} title = {"Deflection Diagram and Support Reactions"}/>
                    <YAxis tickFormat = {formatVal(deflectionScale)}/>
                    <LineSeries data = {[{x : 0, y : 0},{x : beamProperties.length,y : 0}]} />
                    <LineSeries data={deflectionDiagram()}/>
                    {/* Include reactions in deflection plot */}
                    <LabelSeries data={plotReactions(loads, beamProperties, supportProperties, deflectionScale)} />
                </XYPlot>
                {/* Bending Moment Diagram */}
                <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain = {[bendingMomentScale, bendingMomentScale]} margin = {{left : 60, right:60}}>
                    <VerticalGridLines/>
                    <HorizontalGridLines/>
                    <XAxis tickFormat = {formatVal(beamProperties.length)} title = {"Bending Moment Diagram"}/>
                    <YAxis tickFormat = {formatVal(bendingMomentScale)}/>
                    <LineSeries data = {[{x : 0, y : 0},{x : beamProperties.length,y : 0}]} />
                    <LineSeries data={bendingMomentDiagram()}/>
                </XYPlot>
                {/* Shear Force Diagram */}
                <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain ={[shearForceScale, shearForceScale]} margin = {{left : 60, right:60}}>
                    {/*<h1>Shear Force Diagram</h1>*/}
                    <VerticalGridLines/>
                    <HorizontalGridLines/>
                    <XAxis tickFormat = {formatVal(beamProperties.length)} title = {"Shear Force Diagram"}/>
                    <YAxis tickFormat = {formatVal(shearForceScale)}/>
                    <LineSeries data = {[{x : 0, y : 0},{x : beamProperties.length,y : 0}]} />
                    <LineSeries data={shearForceDiagram()}/>
                </XYPlot>
            </div>
        </div>
    )
}

/**
 * Function for load labels for the Load Location plot.
 * For point loads it puts load name, position, and mass.
 * For distributed loads it puts load name, position, mass, and length. 
 * Point load labels are higher than the rest to reduce the amount of overlapping text.
 * 
 * This function also creates arrow text characters to indicate the positions of loads.
 * This function is not responsible for displaying the line part of the distributed loads, but it does give the arrows.
 */
function labelMakerForLoads(loads, selectedLoad, beamProperties){
    var data = []
    for(let load in loads){
        // Check if the load is a point load, and if it is the selected load.
        let isPoint = loads[load].type === "Point"
        let isSelected = load === selectedLoad

        // xLoc is the center of the load. It serves as the location for labels, and the x coordinate users see for loads.
        let xLoc = loads[load].location + loads[load].length/2

        // For selected load, the stats will be labelled with letters. For non-point loads, length will be included.
        let statsLabel = (isSelected?"x=":"") + xLoc + ", " + (isSelected?"m=":"") + loads[load].mass
        if(loads[load].type !== "Point")
            statsLabel += ", " + (isSelected?"L=":"") + loads[load].length

        // Load name and stats labels. For point loads it will be 10 units higher.
        data.push({x: xLoc, y: isPoint?35:25, label: load, loadID: load, style: {fontSize: 10, dominantBaseline: "text-after-edge", textAnchor: "middle"}})
        data.push({x: xLoc, y: isPoint?30:20, label: statsLabel, loadID: load, style: {fontSize: 10, dominantBaseline: "text-after-edge", textAnchor: "middle"}})

        // Point Loads have a big arrow, distributed loads have mini arrows
        if(loads[load].type === "Point"){
            data.push({x: xLoc, y: -5, label: "\u2193", loadID: load, style: {fontSize: 45, font: "verdana", dominantBaseline: "text-after-edge", textAnchor: "middle"}})
        }else{
            getDistributedLoadMiniArrows(data, loads[load].location, loads[load].length, beamProperties.length, loads[load].color, load);
        }
    }
    return data;
}

/**
 * Function for adding mini arrows under the distributed loads.
 * Loads will have at least one arrow per 5 units, and always have an arrow on each end. 
 * The arrows match the color and loadID of the load.
 * 
 * array is the data array for a LabelSeries that will display these arrows.
 * pos and len are the position and length of the load.
 * color is the color of the load line, so that the arrows can match that color.
 * loadID is the name of the load that these arrows belong to. It is part of allowing users to click on these arrows to select the load to move/delete it.
 */
function getDistributedLoadMiniArrows(array, pos, len, beamLen, color, loadID){
    let numArrows = Math.floor(len / beamLen * 20) + 1;
    // Evenly spaced
    for(let i = 0; i <= numArrows; i++)
        array.push({x: pos + (i/numArrows) * len, y: -3, label: "\u2193", loadID: loadID, style: {fontSize: 25, font: "verdana", fill: color, dominantBaseline: "text-after-edge", textAnchor: "middle"}})
}

// Plot the reactions, R1 and R2.
function plotReactions(loads, beamProperties, supportProperties, scale){
    let R1 = 0
    let R2 = 0
    Object.values(loads).forEach(load => {
        R1 += R1SingleLoad(load, beamProperties, supportProperties)
        R2 += R2SingleLoad(load, beamProperties, supportProperties)
    })

    let reactionLabels = []
    // Left side reaction label (R1)
    // Left side reaction label (R1)
    reactionLabels.push({x: 2.5/100 * beamProperties.length, y: -40/100 * scale, label: formatVal(R1)(R1), style: {fontSize: 15, textAnchor: "middle"}})
    reactionLabels.push({x: 2.5/100 * beamProperties.length, y: -35/100 * scale, label: "\u2191", style: {fontSize: 35, textAnchor: "middle"}})
    // Right side reaction label (R2), only for Simply Supported
    if(supportProperties.type === "Simply Supported") {
        reactionLabels.push({x: 97.5/100 * beamProperties.length, y: -40/100 * scale, label: formatVal(R2)(R2),  style: {fontSize: 15, textAnchor: "middle"}})
        reactionLabels.push({x: 97.5/100 * beamProperties.length, y: -35/100 * scale, label: "\u2191", style: {fontSize: 35, textAnchor: "middle"}})
    }
    return reactionLabels
}

function R1SingleLoad(load, beamProperties, supportProperties){
    // Get relevant variables
    let F = load.mass * beamProperties.gravity
    let X = load.location
    let L = load.length
    let Lb = beamProperties.length

    let R1
    if(load.type === "Point") {
        if(supportProperties.type === "Cantilever")
            R1 = F
        else
            R1 = F/Lb * (Lb - X)
    }
    else {
        if(supportProperties.type === "Cantilever")
            R1 = F*L
        else
            R1 = F*L/Lb * (Lb - X - L/2)
    }
    return R1
}

// R1 + R2 = F (or F*L for distributed load)
function R2SingleLoad(load, beamProperties, supportProperties) {
    // Get relevant variables
    let F = load.mass * beamProperties.gravity
    let L = load.length
    
    let R2
    if(load.type === "Point")
        R2 = F - R1SingleLoad(load, beamProperties, supportProperties)
    else
        R2 = F*L - R1SingleLoad(load, beamProperties, supportProperties)
    return R2
}

// Takes a function that applies to a single load, returns a list of data points for plotting the sum of that function applied to every load.
// The singleLoadFunction can return a value, or a 2-element array for instantaneous change.
// The first element of the array will connect to the line plot to the left, and the second element will connect to the right.
function plotSum(singleLoadFunction, loads, beamProperties, supportProperties) {
    // The list of x-values which the y-values will be calculated for. The resulting points will be connected in a line plot later.
    const xValues = []
    // Add every 100th of the beam, and the ends of each load (for point loads the ends are equal)
    for(let i = 0; i <= 100; i++)
        xValues.push((i/100)*beamProperties.length)
    Object.values(loads).forEach(load => 
        xValues.push(load.location, load.location+load.length)
    )
    // Sort the x values (else the line plot would go back and forth in the x direction)
    xValues.sort((a,b)=>(a > b)? 1 : -1)

    // Calculate y values.
    let plotData = []
    xValues.forEach(xValue => {
        // Before and after variables in case of instantaneous change
        let yValueBefore = 0
        let yValueAfter = 0
        Object.values(loads).forEach(load => {
            let singleYValue = singleLoadFunction(xValue, load, beamProperties, supportProperties)
            if(Array.isArray(singleYValue)) {
                yValueBefore += singleYValue[0]
                yValueAfter += singleYValue[1]
            }
            else {
                yValueBefore += singleYValue
                yValueAfter += singleYValue
            }
        })
        plotData.push({x:xValue, y:yValueBefore}, {x:xValue, y:yValueAfter})
    })
    return plotData
}

// Integral of integral of bending moment. 
// For cantilever, deflection and d/dx deflection are 0 at x=0.
// For simply supported beam, deflection is 0 at x=0 and x=beam length.
function deflectionSingleLoad(x, load, beamProperties, supportProperties) {
    // Get relevant variables
    let F = load.mass * beamProperties.gravity
    let X = load.location
    let L = load.length
    let Lb = beamProperties.length
    let EI = beamProperties.EI

    let y
    if(load.type === "Point") {
        if(x < X)
            y = (x**3-3*x**2*X) / 6
        else
            y = (X**3-3*X**2*x) / 6

        if(supportProperties.type === "Simply Supported")
            y += (-2*Lb**2*X*x + 3*Lb*X*x**2 + 3*Lb*x*X**2 - X*x**3 - x*X**3) / 6 / Lb
    }
    else {
        if(x < X)
            y = (-3*L**2*x**2 - 6*L*X*x**2 + 2*L*x**3) / 12
        else if(x < X + L)
            y = (-1*(X-x)**4 - 6*L**2*x**2 - 12*L*X*x**2 + 4*L*x**3) / 24
        else
            y = ((L+X)**4 - X**4 - 4*L**3*x - 12*L**2*X*x - 12*L*X**2*x) / 24

        if(supportProperties.type === "Simply Supported")
            y += (x*X**4 - x*(L+X)**4 -2*L**2*x**3 - 4*L*x**3*X - 4*L**2*Lb**2*x + 4*L**3*Lb*x + 6*L**2*Lb*x**2 - 8*L*Lb**2*x*X + 12*L**2*Lb*x*X + 12*L*Lb*x*X**2 + 12*L*Lb*X*x**2) / 24 / Lb
    }

    y *= F / EI

    // Prevent floating point errors when there is only 1 point mass and it's on top of a supported end of the beam. It should be 0 but sometimes floating point errors happen here.
    if(Math.abs(y) < 10**-18)
        y = 0

    return y
}

// Integral of shear force. Bending moment is 0 at x=beam length, for both support types.
function bendingMomentSingleLoad(x, load, beamProperties, supportProperties) {
    // Get relevant variables
    let F = load.mass * beamProperties.gravity
    let X = load.location
    let L = load.length
    let Lb = beamProperties.length

    let y
    if(load.type === "Point") {
        if(x < X)
            y = F * (x - X)
        else
            y = 0

        if(supportProperties.type === "Simply Supported")
            y -= F * X / Lb * (x-Lb)
    }
    else {
        if(x < X)
            y = F * L * (x-X-L/2)
        else if(x < X + L)
            y = F * (L*x - X*L + X*x - (L**2+X**2+x**2)/2)
        else
            y = 0
        
        if(supportProperties.type === "Simply Supported")
            y -= F * L * (2*X+L) / 2 / Lb * (x-Lb)
    }
    return y
}

function shearForceSingleLoad(x, load, beamProperties, supportProperties) {
    // Get relevant variables
    let X = load.location
    let F = load.mass * beamProperties.gravity
    let L = load.length
    let Lb = beamProperties.length

    let y
    if(load.type === "Point") {
        if(x < X)
            y = F
        else if(x == X)
            // Array represents instantaneous change in y
            y = [F,0]
        else
            y = 0

        // For Cantilever, shear force at x=0 is F. For Simply Supported, it is something else, and the whole graph is translated down.
        if(supportProperties.type === "Simply Supported") {
            if(Array.isArray(y)) {
                y[0] -= F * X / Lb
                y[1] -= F * X / Lb
            }
            else
                y -= F * X / Lb
        }
    }
    else {
        if(x < X)
            y = F * L
        else if(x < X + L)
            y = F * (X + L - x)
        else
            y = 0
        
        // For Cantilever, shear force at x=0 is F*L. For Simply Supported, it is something else, and the whole graph is translated down.
        if(supportProperties.type === "Simply Supported")
            y -= F * L * (2*X+L) / 2 / Lb
    }
    return y
}

// Find a scale for the y axis that comfortably fits the graph.
function getScale(dataList) {
    // Find the biggest absolute value in datalist
    let maxAbsVal = 0
    dataList.forEach(dataPoint =>
        maxAbsVal = Math.max(maxAbsVal, Math.abs(dataPoint.y))
    )
    
    // If the line is all 0, scale will be 1
    if(maxAbsVal == 0)
        return 1

    // Else, the scale will be the smallest power of 2 greater than maxAbsVal
    let scale = 1
    while(scale > maxAbsVal)
        scale /= 2
    while(scale < maxAbsVal)
        scale *= 2

    return scale
}

// This function returns a formatting function for numbers, using the given scale.
function formatVal(scale) {
    // If the scale is very large or tiny, return a function that converts vals to scientific notation.
    if(scale >= 10**5 || (scale <= 10**-4 && scale != 0))
        return val => {
            val = Number(val.toPrecision(6))
            return "" + (val == 0 ? val : val.toExponential())
        }
    // If scale is normal or scale is exactly 0, return a function that just returns val.
    else
        return val => {
            val = Number(val.toPrecision(6))
            return "" + val
        }
    // Both functions round the vals to a precision of 6 to avoid floating point trails.
    // They must also be concatenated with a string or some labels will not display 0 (they view it as false and put no label)
}

// Function to pick the first unoccupied load name like load1, load2, load3...
function loadNamer(loads){
    let i = 1
    while(true){
        let name = "Load " + i
        if(!(name in loads))
            return name
        i++
    }
}

// Radio buttons displaying list of loads in the initial form
function loadRadioButtonsCreator(loads){
    let labels = [];
    for(let load in loads)
        labels.push(<FormControlLabel
            key={load} value={load} control={<Radio/>}
            label={load + 
                ", Type = " + loads[load].type + 
                ": Location = " + (loads[load].location + loads[load].length / 2) + 
                ", Mass = " + loads[load].mass + 
                (loads[load].type!=="Point" ? ", Length = " + loads[load].length : "") + 
                (loads[load].type==="Triangular" ? ", Taller End = " + loads[load].tallerEnd : "")}
        />)
    return labels;
}

export default CombinedLoadApp;