import '../App.css'
import React, { useEffect, useState} from 'react'
import {Button, Dialog, DialogContent, FormControlLabel, Radio, RadioGroup, Table, TableBody, TableCell, TableHead, TableRow} from '@mui/material'
import LoadSelector from '../components/LoadSelector'
import AddEditForm from '../components/AddEditForm'
import {HorizontalGridLines, LabelSeries, LineSeries, VerticalGridLines, XAxis, XYPlot, YAxis} from "react-vis"


function CombinedLoadApp(){
    // Data
    const [beamProperties,setBeamProperties] = useState({["Length of Beam"]: 100, 
                                                         Elasticity: 1.0, 
                                                         Inertia: 1.0, 
                                                         Density: 1.0, 
                                                         Area: 1.0, 
                                                         ["Damping Ratio"]:0.02, 
                                                         rA: 85000.0, 
                                                         EI: 210000000000.0, 
                                                         Gravity:9.8,
                                                         ["Support Type"]: "Simply Supported",
                                                         ["Pinned Support Position"]: 0,
                                                         ["Roller Support Position"]: 100
                                                        })
    const [loads,setLoads] = useState([])
    // The scales of plots
    const [deflectionScale, setDeflectionScale] = useState(1)
    const [bendingMomentScale, setBendingMomentScale] = useState(1)
    const [shearForceScale, setShearForceScale] = useState(1)
    // The current load to move/modify/delete
    const [selectedLoadID, setSelectedLoadID] = useState(-1)
    // Whether forms should be shown
    const [openHelpMenu, setOpenHelpMenu] = useState(false)
    const [openPropertiesForm, setOpenPropertiesForm] = useState(true)
    const [propertiesFormWarning, setPropertiesFormWarning] = useState("")
    const [invalidPropertiesFields, setInvalidPropertiesFields] = useState([])
    const [openAddEditForm, setOpenAddEditForm] = useState(false)
    const [addEditFormWarning, setAddEditFormWarning] = useState("")
    const [invalidAddEditFields, setInvalidAddEditFields] = useState([])
    // Whether the user is currently adding or editing in the add/edit form
    const [addEditMode, setAddEditMode] = useState("Add")
    // The data being entered in the add/edit form
    const [newLoad, setNewLoad] = useState({Name:getFreeName(loads),
                                            Type:"Point", 
                                            Location:getSafePosition(beamProperties),
                                            Mass:10.0,
                                            Length:0,
                                            ["Taller End"]: "Left", 
                                            Color:getRandomColor()})


    // Automatically re-renders the screen when called
    const [render, setRender] = useState(false)
    function reRender() {
        // Wrapping setRender inside setTimeout causes the screen to rerender more smoothly when the user holds down a movement key.
        setTimeout(()=>setRender(!render),0)
    }
    // Automatically resizes the plots when the user resizes the window
    const [dims, setDims] = useState([])
    useEffect(() => {
        window.addEventListener("resize", ()=>setDims([window,innerHeight,window.innerWidth]))
        return () => window.removeEventListener("resize", ()=>setDims([window,innerHeight,window.innerWidth]))
    },[])
    // Automatically sets the focus on the page so the user can use keyboard controls
    const propertiesFormRef = React.useRef(null)
    const plotScreenRef = React.useRef(null)
    useEffect(()=>{
        if(propertiesFormRef.current)
            propertiesFormRef.current.focus()
    },[openPropertiesForm])
    useEffect(()=>{
        if(plotScreenRef.current)
            plotScreenRef.current.focus()
    },[openPropertiesForm])

    /**
     * Function that manages keyboard controls.
     * User may submit forms by pressing Enter, 
     * use the arrow keys to jump or move the load left or right,
     * or press the delete key to delete a load.
     */
    function handleKeyDown(event){
        // On the add/edit form
        if(openAddEditForm){
            // Enter
            if(event.keyCode == 13) {
                handleCloseAddEditForm("confirm")
                event.preventDefault()
            }
            // Escape already works, no code here needed. It closes the form without making the add/edit.
        }
        // On the properties form
        else if(openPropertiesForm) {
            if(event.shiftKey) {
                // Shift + Insert
                if(event.keyCode == 45)
                    handleClickAdd()
                // Shift + Enter
                else if(event.keyCode == 13)
                    handleClickEdit()
                // Shift + Backspace and Shift + Delete
                if(event.keyCode == 8 || event.keyCode == 46)
                handleClickDelete()
            }
            else
                // Enter
                if(event.keyCode == 13) {
                    handleClosePropertiesForm(null)
                    event.preventDefault()
                }
                // Escape is not intended to do anything here.
        }
        // On the main plots screen
        else {
            if(event.shiftKey) {
                // Shift + Insert
                if(event.keyCode == 45)
                    handleClickAdd()
                // Shift + Enter
                else if(event.keyCode == 13)
                    handleClickEdit()
                // Shift + Backspace and Shift + Delete
                else if(event.keyCode == 8 || event.keyCode == 46)
                    handleClickDelete()
            }
            // Escape
            else if(event.keyCode == 27)
                handleClickProperties()
            // Left arrow key
            if(event.keyCode == 37)
                moveSelectedLoad(-beamProperties["Length of Beam"]/100,1,10)
            // Up arrow key (Jump)
            else if(event.keyCode == 38)
                moveSelectedLoad(0,5,10)
            // Right arrow key
            else if(event.keyCode == 39)
                moveSelectedLoad(beamProperties["Length of Beam"]/100,1,10)
            
            // Disable the screen scroll from arrow keys
            if([37,38,39,40].includes(event.keyCode))
                event.preventDefault()
        }
    }

    // Move the selected load
    function moveSelectedLoad(disp,mag,tl){
        if(selectedLoadID < 0)
            return
        let load = loads[selectedLoadID]

        let newLoc = load.Location + disp
        // Round off floating point
        newLoc = formatVal(newLoc)(newLoc)
        // Constrain newLoc to be in-bounds
        newLoc = Math.max(newLoc, 0)
        newLoc = Math.min(newLoc, beamProperties["Length of Beam"] - load.Length)
        load.Location = newLoc

        reRender()
    }

    // When Add Load button is clicked
    const handleClickAdd = () => {
        setNewLoad({Name:getFreeName(loads),
                    Type:"Point",
                    Location:getSafePosition(beamProperties),
                    Mass:10.0,
                    Length:beamProperties["Length of Beam"] / 2,
                    ["Taller End"]:"Left",
                    Color:getRandomColor()})
        // Display add/edit form in add mode.
        setOpenAddEditForm(true)
        setAddEditMode("Add")
    }
    // When Edit Load button is clicked
    const handleClickEdit = () => {
        if(selectedLoadID < 0)
            return
        // Put preexisting load properties.
        setNewLoad({Name:loads[selectedLoadID].Name, 
                    Type:loads[selectedLoadID].Type,
                    Location:loads[selectedLoadID].Location + loads[selectedLoadID].Length / 2, // Convert to display format, where location = the middle of the load
                    Mass:loads[selectedLoadID].Mass,
                    Length:loads[selectedLoadID].Length > 0?loads[selectedLoadID].Length:beamProperties["Length of Beam"] / 2,
                    ["Taller End"]:loads[selectedLoadID]["Taller End"],
                    Color:loads[selectedLoadID].Color})
        // Display add/edit form in edit mode.
        setOpenAddEditForm(true)
        setAddEditMode("Edit")
    }
    // When Delete Load button is clicked
    function handleClickDelete(){
        if(selectedLoadID < 0)
            return
        loads.splice(selectedLoadID,1)
        setSelectedLoadID(loads.length - 1)
        reRender()
    }
    // When Edit Properties button is clicked
    function handleClickProperties() {
        setOpenPropertiesForm(true)
    }
    // When Help button is clicked
    function handleClickHelp() {
        setOpenHelpMenu(true)
    }

    // When using the load selector dropdown or properties form radio buttons to change selected load
    function handleSelectedChange(event){
        setSelectedLoadID(event.target.value)
    }
    // When clicking an arrow, line, or label corresponding to a load to change selected load
    function handleClickLoad(element){
        setSelectedLoadID(element.loadID)
    }

    // Function to submit the properties form
    function handleClosePropertiesForm(e){
        validateInputsPropertiesForm(["Length of Beam","Elasticity","Inertia","Density","Area","Damping Ratio","rA","EI","Gravity","Pinned Support Position", "Roller Support Position"])
        if(propertiesFormWarning === "") {
            setOpenPropertiesForm(false)
            reRender()
        } 
        else if(e != null)
            e.preventDefault()
    }
    // When closing the Add/Edit Load form by clicking out, canceling, or confirming.
    function handleCloseAddEditForm (event) {
        // If user clicked out or cancelled, do nothing and close the form.
        if(event !== "confirm"){
            setOpenAddEditForm(false)
            setAddEditFormWarning("")
            return
        }
        // If errors are present and user attempted to submit, do nothing and leave the form open.
        validateInputsAddEditForm(["Name","Location","Mass","Length"])
        if(addEditFormWarning !== "")
            return
        // Successful submission of the form

        // Simplifies calculations if we can read point loads' Length as 0
        if(newLoad.Type === "Point")
            newLoad.Length = 0
        if(newLoad.Type !== "Triangular")
            newLoad["Taller End"] = "Left"

        // Convert Location from display format (Location = middle of beam) to internal format (Location = left end of beam)
        newLoad.Location -= newLoad.Length / 2

        if(addEditMode === "Add") {
            loads.push(newLoad)
            setSelectedLoadID(loads.length - 1)
        }
        else
            loads[selectedLoadID] = newLoad

        setOpenAddEditForm(false)
    }

    /**
     * This function checks the properties form inputs to ensure that they are valid. 
     * All inputs must be nonnegative numbers. Beam length and EI must be nonzero. 
     * Support positions must be in-bounds (between 0 and beam length inclusive), and beam length must not be decreased to make any load out-of-bounds.
     * This function also converts the string inputs into number inputs.
     * Fields include "Length of Beam","Elasticity","Inertia","Density","Area","Damping Ratio","rA","EI","Gravity","Support Type","Pinned Support Position","Roller Support Position"
     */
     function validateInputsPropertiesForm(fields){
        // Clear the errors
        setPropertiesFormWarning("")
        let newInvalidPropertiesFields = []

        // Add entered fields to the list of fields to check
        if(Array.isArray(fields))
            fields.forEach(field => {
                if(!invalidPropertiesFields.includes(field))
                    invalidPropertiesFields.push(field)
            })
        else
            if(!invalidPropertiesFields.includes(fields))
                invalidPropertiesFields.push(fields)

        invalidPropertiesFields.forEach(field=> {
            // Skip validating supports if not simply supported.
            if(["Pinned Support Position", "Roller Support Position"].includes(field) && beamProperties["Support Type"] !== "Simply Supported")
                return

            // Check that field is a number.
            if(parseFloat(beamProperties[field]) != beamProperties[field]){
                setPropertiesFormWarning(field + " must be a number.")
                newInvalidPropertiesFields.push(field)
                return
            }
            // Check that field >= 0
            beamProperties[field] = Number(beamProperties[field])
            if(beamProperties[field] < 0) {
                setPropertiesFormWarning(field + " must be at least 0.")
                newInvalidPropertiesFields.push(field)
                return
            }

            // Length of Beam and EI cannot be 0
            if(["Length of Beam", "EI"].includes(field))
                if(beamProperties[field] == 0) {
                    setPropertiesFormWarning(field + " cannot be 0.")
                    newInvalidPropertiesFields.push(field)
                    return
                }

            // Pinned and Roller Support Positions must be <= Length of Beam, but it doesn't matter for cantilever beam.
            if(["Length of Beam", "Pinned Support Position", "Roller Support Position"].includes(field) && beamProperties["Support Type"] === "Simply Supported") {
                if(beamProperties["Pinned Support Position"] > beamProperties["Length of Beam"]) {
                    setPropertiesFormWarning("Pinned Support Position must be less than or equal to Length of Beam.")
                    newInvalidPropertiesFields.push(field)
                    return
                }
                if(beamProperties["Roller Support Position"] > beamProperties["Length of Beam"]) {
                    setPropertiesFormWarning("Roller Support Position must be less than or equal to Length of Beam.")
                    newInvalidPropertiesFields.push(field)
                    return
                }
            }

            // If Length of Beam is decreased, preexisting loads might become out of bounds.
            if(field === "Length of Beam")
                // Check that existing loads are not invalidated by length of beam change.
                loads.forEach(load =>{
                    if(load.Type === "Point" && load.Location > beamProperties["Length of Beam"]) {
                        setPropertiesFormWarning(load.Name + " location must be less than or equal to Length of Beam.")
                        if(!newInvalidPropertiesFields.includes(field))
                            newInvalidPropertiesFields.push(field)
                    }
                    else if(load.Type !== "Point" && load.Location + load.Length > beamProperties["Length of Beam"]) {
                        setPropertiesFormWarning("Right end of " + load.Name + " is out of bounds (Location is " + (load.Location + load.Length) + ", must be less than or equal to Length of Beam).")
                        if(!newInvalidPropertiesFields.includes(field))
                            newInvalidPropertiesFields.push(field)
                    }
                })
        })
        setInvalidPropertiesFields(newInvalidPropertiesFields)
    }
    /**
     * This function checks the add/edit form inputs to ensure that they are valid. 
     * All inputs must be nonnegative numbers. 
     * Duplicate names are not allowed.
     * Loads must not extend out of bounds.
     * This function also converts the string inputs into number inputs.
     */
     function validateInputsAddEditForm(fields){
        // Clear the errors
        setAddEditFormWarning("")
        let newInvalidAddEditFields = []

        // Add entered fields to the list of fields to check
        if(Array.isArray(fields))
            fields.forEach(field => {
                if(!invalidAddEditFields.includes(field))
                    invalidAddEditFields.push(field)
            })
        else
            if(!invalidAddEditFields.includes(fields))
                invalidAddEditFields.push(fields)

        invalidAddEditFields.forEach(field=> {
            if(field === "Name") {
                // Check that Name is not in use (ignoring the load currently being edited).
                let nameInUse = false
                loads.forEach((load,loadID)=>{
                    if(load.Name === newLoad.Name && !(addEditMode === "Edit" && loadID == selectedLoadID))
                        nameInUse = true
                })
                if(nameInUse) {
                    setAddEditFormWarning("Name is already in use.")
                    newInvalidAddEditFields.push(field)
                    return
                }
            }

            if(["Location", "Mass", "Length"].includes(field)) {
                // Check that field is a number.
                if(parseFloat(newLoad[field]) != newLoad[field]){
                    setAddEditFormWarning(field + " must be a number.")
                    newInvalidAddEditFields.push(field)
                    return
                }
                newLoad[field] = Number(newLoad[field])
            }

            if(field === "Mass") {
                if(newLoad[field] < 0) {
                    setAddEditFormWarning("Mass must be at least 0.")
                    newInvalidAddEditFields.push(field)
                    return
                }
            }

            if(field === "Length" && newLoad.Type !== "Point") {
                if(newLoad[field] <= 0) {
                    setAddEditFormWarning("Length must be greater than 0.")
                    newInvalidAddEditFields.push(field)
                    return
                }
            }

            if((["Location", "Length"].includes(field))) {
                // Check that load location is in-bounds, for point load.
                if(newLoad.Type === "Point") {
                    if(newLoad.Location < 0) {
                        setAddEditFormWarning("Location must be at least 0.")
                        newInvalidAddEditFields.push(field)
                        return
                    }
                    if(newLoad.Location > beamProperties["Length of Beam"]) {
                        setAddEditFormWarning("Location must be less than or equal to Length of Beam.")
                        newInvalidAddEditFields.push(field)
                        return
                    }
                }
                // Check that left and right ends of the load are in-bounds, for long loads.
                else {
                    // While the form is open, newLoad.location refers to the middle of the load instead of the left end.
                    let leftEnd = newLoad.Location - newLoad.Length / 2
                    if(leftEnd < 0) {
                        setAddEditFormWarning("Left end of load is out of bounds (Location is " + leftEnd + ", must be at least 0).")
                        newInvalidAddEditFields.push(field)
                        return
                    }
                    let rightEnd = newLoad.Location + newLoad.Length / 2
                    if(rightEnd > beamProperties["Length of Beam"]){
                        setAddEditFormWarning("Right end of load is out of bounds (Location is " + rightEnd + ", must be less than or equal to Length of Beam).")
                        newInvalidAddEditFields.push(field)
                        return
                    }
                }
            }
        })
        setInvalidAddEditFields(newInvalidAddEditFields)
    }

    // Returns LineSeries plot points for deflection diagram. Also updates the scale for the plot.
    function deflectionDiagram() {
        // Get data points for deflection plot
        let plotData = plotSum(deflectionSingleLoad, loads, beamProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != deflectionScale)
            setDeflectionScale(newScale)

        return plotData
    }
    // Returns LineSeries plot points for bending moment diagram. Also updates the scale for the plot.
    function bendingMomentDiagram() {
        // Get data points for bending moment plot
        let plotData = plotSum(bendingMomentSingleLoad, loads, beamProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != bendingMomentScale)
            setBendingMomentScale(newScale)

        return plotData
    }
    // Returns LineSeries plot points for shear force diagram. Also updates the scale for the plot.
    function shearForceDiagram() {
        // Get data points for shear force plot
        let plotData = plotSum(shearForceSingleLoad, loads, beamProperties)

        // Update plot scale if needed
        let newScale = getScale(plotData)
        if(newScale != shearForceScale)
            setShearForceScale(newScale)

        return plotData
    }

    // Display the properties form
    if(openPropertiesForm){
        return(
            <form onKeyDown={handleKeyDown} onSubmit={handleClosePropertiesForm} ref={propertiesFormRef} tabIndex="0">
                <h1>CARL</h1>
                {/* Enter beam properties */}
                <div>
                    <h3 style={{marginBottom: 0}}>Beam Properties</h3>
                    {["Length of Beam","Elasticity","Inertia","Density","Area","Damping Ratio","rA","EI","Gravity"].map(field=>{
                        return(
                        <div>{field}:
                            <input type="text"
                                defaultValue={beamProperties[field]}
                                onChange={(e) => {
                                    beamProperties[field] = e.target.value
                                    validateInputsPropertiesForm(field)
                                }}
                                key={field}
                            />
                        </div>)
                    })}
                </div>
                {/* Enter support properties */}
                <div>
                    <h3 style={{marginBottom: 0}}>Support Properties</h3>
                    {/* Support type radio button selection */}
                    <RadioGroup
                        value={beamProperties["Support Type"]}
                        onChange={(val)=>{
                            beamProperties["Support Type"] = val.target.value
                            validateInputsPropertiesForm(["Length of Beam", "Pinned Support Position", "Roller Support Position"])
                            reRender()
                        }}
                        sx={{display:'inline-flex'}}
                        row
                    >
                        <FormControlLabel control={<Radio />} value="Simply Supported" label="Simply Supported" />
                        <FormControlLabel control={<Radio />} value="Cantilever" label="Cantilever" />
                    </RadioGroup>
                    {["Pinned Support Position","Roller Support Position"].map(field=>{
                        return(
                        <div>{field}:
                            <input type="text"
                                defaultValue={beamProperties[field]}
                                onChange={(e) => {
                                    beamProperties[field] = e.target.value
                                    validateInputsPropertiesForm(field)
                                }}
                                key={field}
                                disabled={beamProperties["Support Type"] !== "Simply Supported"}
                            />
                        </div>)
                    })}
                </div>
                {/* Enter loads */}
                <div>
                    {/* Load list with radio button selection */}
                    <h3 style={{marginBottom: 0}}>List of Loads</h3>
                    <RadioGroup
                        value={selectedLoadID}
                        onChange={handleSelectedChange}
                        sx={{display:'inline-flex'}}
                    >
                        {loadRadioButtonsCreator(loads)}
                    </RadioGroup>
                    <div>
                        {/* Add, Edit, Delete Load buttons */}
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickAdd}>Add Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickEdit} disabled={loads.length === 0}>Edit Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickDelete} disabled={loads.length === 0}>Delete Load</Button>
                        {/* Add/Edit Load form */}
                        <AddEditForm
                            open={openAddEditForm} 
                            mode={addEditMode}
                            handleClose={handleCloseAddEditForm}
                            newLoad={newLoad}
                            validate={validateInputsAddEditForm}
                            warning={addEditFormWarning}
                        />
                    </div>
                </div>
                {/* Text display for invalid inputs. */}
                <p style={{fontWeight: 'bold'}}>{propertiesFormWarning}</p>
                {/* Submit button. */}
                <input type="submit" value="Analyze"/>
            </form>
        )
    }
    else {
        // Display the main plots screen
        return(
            <div className={"rowC"} onKeyDown={handleKeyDown} ref={plotScreenRef} tabIndex="0">
                <div style={{height:window.innerHeight - 100, overflowX:"clip", overflowY:"auto", borderRight:"1px solid"}}>
                    <h1>CARL</h1>
                    {/* Main Plot */}
                    <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} xDomain={[0,beamProperties["Length of Beam"]]} yDomain={[-100, 100]} margin = {{left : 60, right:60}}>
                        <VerticalGridLines/>
                        <HorizontalGridLines/>
                        <XAxis tickFormat={formatVal(beamProperties["Length of Beam"])} title = {"Load Locations"}/>
                        <YAxis hideTicks/>
                        {/* Display the beam line. */}
                        <LineSeries data = {[{x: 0, y: 0}, {x: beamProperties["Length of Beam"], y: 0}]} />
                        {/* Display the supports. */}
                        {
                            (beamProperties["Support Type"] === "Simply Supported")
                            ?
                                // Simply Supported supports
                                <LabelSeries data={[{x: beamProperties["Pinned Support Position"], y: -11, label: "\u25b2", style: {fontSize: 25, font: "verdana", fill: "#12939A", dominantBaseline: "text-after-edge", textAnchor: "middle"}},
                                                    {x: beamProperties["Roller Support Position"], y: -11, label: "\u2b24", style: {fontSize: 25, font: "verdana", fill: "#12939A", dominantBaseline: "text-after-edge", textAnchor: "middle"}}]} />
                            :
                                // Cantilever support
                                getCantileverSupportDisplay(beamProperties["Length of Beam"])
                        }
                        {/* Display the labels and arrows for loads. */}
                        <LabelSeries data={labelMakerForLoads(loads,selectedLoadID,beamProperties)} onValueClick={handleClickLoad} />
                        {/* Display the line parts of distributed and triangular loads. */}
                        {loads.map((load, loadID) => {
                            if(load.Type === "Point")
                                return
                            let data
                            if(load.Type === "Distributed")
                                data = [{x: load.Location, y: 8}, {x: (load.Location+load.Length), y: 8}]
                            else if(load.Type === "Triangular"){
                                if(load["Taller End"]==="Left")
                                    data = [{x: load.Location, y: 8}, {x: load.Location, y: 20}, {x: (load.Location+load.Length), y: 8}, {x: load.Location, y: 8}]
                                else
                                    data = [{x: load.Location, y: 8}, {x: (load.Location+load.Length), y: 20}, {x: (load.Location+load.Length), y: 8}, {x: load.Location, y: 8}]
                            }
                            return (
                                <LineSeries
                                    data={data}
                                    onSeriesClick={() => {setSelectedLoadID(loadID)}}
                                    key={loadID}
                                    color={load.Color}
                                    strokeWidth={3}
                                />
                            )
                        })}
                    </XYPlot>
                    {/* Load Selection dropdown */}
                    <LoadSelector loads={loads} value={selectedLoadID} onChange={handleSelectedChange} />
                    <div>
                        {/* Add, Edit, Delete Load buttons */}
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickAdd}>Add Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickEdit} disabled={loads.length === 0}>Edit Load</Button>
                        <Button variant="outlined" sx={{width:135}} onClick={handleClickDelete} disabled={loads.length === 0}>Delete Load</Button>
                        {/* Add/Edit Load form */}
                        <AddEditForm
                            open={openAddEditForm} 
                            mode={addEditMode}
                            handleClose={handleCloseAddEditForm}
                            newLoad={newLoad}
                            validate={validateInputsAddEditForm}
                            warning={addEditFormWarning}
                        />
                    </div>
                    <div>
                        {/* Control buttons */}
                        <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{moveSelectedLoad(-beamProperties["Length of Beam"]/100,1,10)}}>&#8592;</Button>
                        <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{moveSelectedLoad(0,5,10)}}>JUMP</Button>
                        <Button variant="contained" sx={{margin: 0.5}} onClick={()=>{moveSelectedLoad(beamProperties["Length of Beam"]/100,1,10)}}>&#8594;</Button>
                    </div>
                    <Button variant="contained" sx={{margin:0.5}} onClick={handleClickProperties}>Edit Properties</Button>
                    <div></div>
                    <Button variant="contained" sx={{margin:0.5}} onClick={handleClickHelp}>Help</Button>
                    <Dialog open={openHelpMenu} onClose={()=>setOpenHelpMenu(false)}>
                        <DialogContent>
                            <Table sx={{minWidth: 500}}>
                                <TableHead>Keyboard Shortcuts</TableHead>
                                <TableBody>{[
                                    ["Left/Right Arrows:", "Move Selected Load"],
                                    ["Up Arrow:", "Jump"],
                                    ["Shift + Insert:", "Add Load"],
                                    ["Shift + Enter:", "Edit Selected Load"],
                                    ["Shift + Delete:", "Delete Selected Load"],
                                    ["Esc:", "Edit Properties"]].map(row=>
                                        <TableRow key={row[0]}>
                                            {row.map(col=>
                                                <TableCell>{col}</TableCell>
                                            )}
                                        </TableRow>
                                )}</TableBody>
                            </Table>
                        </DialogContent>
                    </Dialog>
                </div>
                {/* Right Column */}
                <div style={{height:window.innerHeight - 100, overflowX:"clip", overflowY:"auto"}}>
                    <h1>Plots</h1>
                    {/* Deflection Diagram */}
                    <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain = {[deflectionScale, deflectionScale]} margin = {{left:60, right:60}}>
                        <VerticalGridLines/>
                        <HorizontalGridLines/>
                        <XAxis tickFormat = {formatVal(beamProperties["Length of Beam"])} title = {"Deflection Diagram and Support Reactions"}/>
                        <YAxis tickFormat = {formatVal(deflectionScale)}/>
                        <LineSeries data = {[{x : 0, y : 0},{x : beamProperties["Length of Beam"],y : 0}]} />
                        <LineSeries data={deflectionDiagram()}/>
                        {/* Include reactions in deflection plot */}
                        <LabelSeries data={plotReactions(loads, beamProperties, deflectionScale)} />
                    </XYPlot>
                    {/* Bending Moment Diagram */}
                    <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain = {[bendingMomentScale, bendingMomentScale]} margin = {{left:60, right:60}}>
                        <VerticalGridLines/>
                        <HorizontalGridLines/>
                        <XAxis tickFormat = {formatVal(beamProperties["Length of Beam"])} title = {"Bending Moment Diagram"}/>
                        <YAxis tickFormat = {formatVal(bendingMomentScale)}/>
                        <LineSeries data = {[{x : 0, y : 0},{x : beamProperties["Length of Beam"],y : 0}]} />
                        <LineSeries data={bendingMomentDiagram()} color="black"/>
                    </XYPlot>
                    {/* Shear Force Diagram */}
                    <XYPlot height={window.innerHeight * 0.5} width={window.innerWidth/2} yDomain ={[shearForceScale, shearForceScale]} margin = {{left:60, right:60}}>
                        {/*<h1>Shear Force Diagram</h1>*/}
                        <VerticalGridLines/>
                        <HorizontalGridLines/>
                        <XAxis tickFormat = {formatVal(beamProperties["Length of Beam"])} title = {"Shear Force Diagram"}/>
                        <YAxis tickFormat = {formatVal(shearForceScale)}/>
                        <LineSeries data = {[{x : 0, y : 0},{x : beamProperties["Length of Beam"],y : 0}]} />
                        <LineSeries data={shearForceDiagram()} color="red"/>
                    </XYPlot>
                </div>
            </div>
        )
    }
}

// Radio buttons displaying list of loads in the properties form
function loadRadioButtonsCreator(loads){
    let labels = []
    loads.forEach((load,loadID)=>
        labels.push(<FormControlLabel control={<Radio/>}
            value={loadID}
            key={loadID}
            label={"Name = " + load.Name + 
                ", Type = " + load.Type + 
                ": Location = " + (load.Location + load.Length / 2) +  // Convert to display format, where location = the middle of the load
                ", Mass = " + load.Mass + 
                (load.Type!=="Point" ? ", Length = " + load.Length : "") + 
                (load.Type==="Triangular" ? ", Taller End = " + load["Taller End"] : "")}
        />)
    )
        
    return labels
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
function labelMakerForLoads(loads, selectedLoadID, beamProperties){
    var data = []
    loads.forEach((load,loadID)=>{
        // Check if the load is a point load, and if it is the selected load.
        let isPoint = load.Type === "Point"
        let isSelected = loadID == selectedLoadID

        // xLoc is the center of the load. It serves as the location for labels, and the x coordinate users see for loads.
        let xLoc = load.Location + load.Length/2 // Convert to display format, where position = the middle of the load

        // For selected load, the stats will be labelled with letters. For non-point loads, length will be included.
        let statsLabel = (isSelected?"x=":"") + xLoc + ", " + (isSelected?"m=":"") + load.Mass
        if(load.Type !== "Point")
            statsLabel += ", " + (isSelected?"L=":"") + load.Length

        // Load name and stats labels. For point loads it will be 10 units higher.
        data.push({x: xLoc, y: isPoint?35:25, label: load.Name, loadID: loadID, style: {fontSize: 10, dominantBaseline: "text-after-edge", textAnchor: "middle"}})
        data.push({x: xLoc, y: isPoint?30:20, label: statsLabel, loadID: loadID, style: {fontSize: 10, dominantBaseline: "text-after-edge", textAnchor: "middle"}})

        // Point Loads have a big arrow, distributed loads have mini arrows
        if(load.Type === "Point")
            data.push({x: xLoc, y: -5, label: "\u2193", loadID: loadID, style: {fontSize: 45, font: "verdana", dominantBaseline: "text-after-edge", textAnchor: "middle"}})
        else
            getDistributedLoadMiniArrows(data, load, loadID, beamProperties["Length of Beam"])
    })
    return data
}

/**
 * Function for adding mini arrows under the distributed loads.
 * Loads will have at least one arrow per 5% of the beam, and always have an arrow on each end. 
 * The arrows match the color and loadID of the load.
 * 
 * array is the data array for a LabelSeries that will display these arrows.
 * pos and len are the position and length of the load.
 * color is the color of the load line, so that the arrows can match that color.
 * loadID is the index of the load that these arrows belong to. It is part of allowing users to click on these arrows to select the load to move/delete it.
 */
function getDistributedLoadMiniArrows(data, load, loadID, beamLength){
    let numArrows = Math.floor(load.Length / beamLength * 20) + 1
    // Evenly spaced
    for(let i = 0; i <= numArrows; i++) {
        let x = load.Location + (i/numArrows) * load.Length
        data.push({x: x, y: -3, label: "\u2193", loadID: loadID, style: {fontSize: 25, font: "verdana", dominantBaseline: "text-after-edge", textAnchor: "middle", fill: load.Color}})
    }
}

// Function for adding the cantilever support visual display.
function getCantileverSupportDisplay(beamLength) {
    let support = []
    support.push(<LineSeries data = {[{x : 0, y : -10}, {x : 0, y : 10}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : 10}, {x : -2/100 * beamLength, y : 6}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : 6}, {x : -2/100 * beamLength, y : 2}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : 2}, {x : -2/100 * beamLength, y : -2}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : -2}, {x : -2/100 * beamLength, y : -6}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : -6}, {x : -2/100 * beamLength, y : -10}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : 10}, {x : -2/100 * beamLength, y : 10}]} color = "#12939A"/>)
    support.push(<LineSeries data = {[{x : 0, y : -10}, {x : -2/100 * beamLength, y : -10}]} color = "#12939A"/>)
    return support
}

// Plot the reactions, R1 and R2.
function plotReactions(loads, beamProperties, scale){
    let R1 = 0
    let R2 = 0
    loads.forEach(load => {
        R1 += R1SingleLoad(load, beamProperties)
        R2 += R2SingleLoad(load, beamProperties)
    })

    let reactionLabels = []
    // Left side reaction label (R1)
    reactionLabels.push({x: 2.5/100 * beamProperties["Length of Beam"], y: -40/100 * scale, label: formatVal(R1)(R1), style: {fontSize: 15, textAnchor: "middle"}})
    reactionLabels.push({x: 2.5/100 * beamProperties["Length of Beam"], y: -35/100 * scale, label: "\u2191", style: {fontSize: 35, textAnchor: "middle"}})
    // Right side reaction label (R2), only for Simply Supported
    if(beamProperties["Support Type"] === "Simply Supported") {
        reactionLabels.push({x: 97.5/100 * beamProperties["Length of Beam"], y: -40/100 * scale, label: formatVal(R2)(R2),  style: {fontSize: 15, textAnchor: "middle"}})
        reactionLabels.push({x: 97.5/100 * beamProperties["Length of Beam"], y: -35/100 * scale, label: "\u2191", style: {fontSize: 35, textAnchor: "middle"}})
    }
    return reactionLabels
}

function R1SingleLoad(load, beamProperties){
    // Get relevant variables
    let F = load.Mass * beamProperties.Gravity
    let X = load.Location
    let L = load.Length
    let Lb = beamProperties["Length of Beam"]

    let R1 = 0
    if(load.Type === "Point") {
        if(beamProperties["Support Type"] === "Cantilever")
            R1 = F
        else
            R1 = F/Lb * (Lb - X)
    }
    else if(load.Type === "Distributed") {
        if(beamProperties["Support Type"] === "Cantilever")
            R1 = F*L
        else
            R1 = F*L/Lb * (Lb - X - L/2)
    }
    else if(load.Type === "Triangular") {
        if(beamProperties["Support Type"] === "Cantilever")
            R1 = F*L
        else
            R1 = F*L/Lb * (Lb - X - L/2)
    }
    return R1
}

// R1 + R2 = F (or F*L for distributed load)
function R2SingleLoad(load, beamProperties) {
    // Get relevant variables
    let F = load.Mass * beamProperties.Gravity
    let L = load.Length
    
    let R2 = 0
    if(load.Type === "Point")
        R2 = F - R1SingleLoad(load, beamProperties)
    else if(load.Type === "Distributed")
        R2 = F*L - R1SingleLoad(load, beamProperties)
    else if(load.Type === "Triangular")
        R2 = F*L - R1SingleLoad(load, beamProperties)
    return R2
}

// Takes a function that applies to a single load, returns a list of data points for plotting the sum of that function applied to every load.
// The singleLoadFunction can return a value, or a 2-element array for instantaneous change.
// The first element of the array will connect to the line plot to the left, and the second element will connect to the right.
function plotSum(singleLoadFunction, loads, beamProperties) {
    // The list of x-values which the y-values will be calculated for. The resulting points will be connected in a line plot later.
    const xValues = []
    // Add every 100th of the beam, and the ends of each load (for point loads the ends are equal)
    for(let i = 0; i <= 100; i++)
        xValues.push((i/100)*beamProperties["Length of Beam"])
    loads.forEach(load => 
        xValues.push(load.Location, load.Location+load.Length)
    )
    // Sort the x values (else the line plot would go back and forth in the x direction)
    xValues.sort((a,b)=>(a > b)? 1 : -1)

    // Calculate y values.
    let plotData = []
    xValues.forEach(xValue => {
        // Before and after variables in case of instantaneous change
        let yValueBefore = 0
        let yValueAfter = 0
        loads.forEach(load => {
            let singleYValue = singleLoadFunction(xValue, load, beamProperties)
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
function deflectionSingleLoad(x, load, beamProperties) {
    // Get relevant variables
    let F = load.Mass * beamProperties.Gravity
    let X = load.Location
    let L = load.Length
    let Lb = beamProperties["Length of Beam"]
    let EI = beamProperties.EI

    let y = 0
    if(load.Type === "Point") {
        if(x < X)
            y = (x**3-3*x**2*X) / 6
        else
            y = (X**3-3*X**2*x) / 6

        if(beamProperties["Support Type"] === "Simply Supported")
            y += (-2*Lb**2*X*x + 3*Lb*X*x**2 + 3*Lb*x*X**2 - X*x**3 - x*X**3) / 6 / Lb
    }
    else if(load.Type === "Distributed") {
        if(x < X)
            y = (-3*L**2*x**2 - 6*L*X*x**2 + 2*L*x**3) / 12
        else if(x < X + L)
            y = (-1*(X-x)**4 - 6*L**2*x**2 - 12*L*X*x**2 + 4*L*x**3) / 24
        else
            y = ((L+X)**4 - X**4 - 4*L**3*x - 12*L**2*X*x - 12*L*X**2*x) / 24

        if(beamProperties["Support Type"] === "Simply Supported")
            y += (x*X**4 - x*(L+X)**4 -2*L**2*x**3 - 4*L*x**3*X - 4*L**2*Lb**2*x + 4*L**3*Lb*x + 6*L**2*Lb*x**2 - 8*L*Lb**2*x*X + 12*L**2*Lb*x*X + 12*L*Lb*x*X**2 + 12*L*Lb*X*x**2) / 24 / Lb
    }
    else if(load.Type === "Triangular") {
        if(x < X)
            y = (-3*L**2*x**2 - 6*L*X*x**2 + 2*L*x**3) / 12
        else if(x < X + L)
            y = (-1*(X-x)**4 - 6*L**2*x**2 - 12*L*X*x**2 + 4*L*x**3) / 24
        else
            y = ((L+X)**4 - X**4 - 4*L**3*x - 12*L**2*X*x - 12*L*X**2*x) / 24

        if(beamProperties["Support Type"] === "Simply Supported")
            y += (x*X**4 - x*(L+X)**4 -2*L**2*x**3 - 4*L*x**3*X - 4*L**2*Lb**2*x + 4*L**3*Lb*x + 6*L**2*Lb*x**2 - 8*L*Lb**2*x*X + 12*L**2*Lb*x*X + 12*L*Lb*x*X**2 + 12*L*Lb*X*x**2) / 24 / Lb
    }

    y *= F / EI

    // Prevent floating point errors when there is only 1 point mass and it's on top of a supported end of the beam. It should be 0 but sometimes floating point errors happen here.
    if(Math.abs(y) < 10**-18)
        y = 0

    return y
}

// Integral of shear force. Bending moment is 0 at x=beam length, for both support types.
function bendingMomentSingleLoad(x, load, beamProperties) {
    // Get relevant variables
    let F = load.Mass * beamProperties.Gravity
    let X = load.Location
    let L = load.Length
    let Lb = beamProperties["Length of Beam"]

    let y = 0
    if(load.Type === "Point") {
        if(x < X)
            y = F * (x - X)
        else
            y = 0

        if(beamProperties["Support Type"] === "Simply Supported")
            y -= F * X / Lb * (x-Lb)
    }
    else if(load.Type === "Distributed") {
        if(x < X)
            y = F * L * (x-X-L/2)
        else if(x < X + L)
            y = F * (L*x - X*L + X*x - (L**2+X**2+x**2)/2)
        else
            y = 0
        
        if(beamProperties["Support Type"] === "Simply Supported")
            y -= F * L * (2*X+L) / 2 / Lb * (x-Lb)
    }
    else if(load.Type === "Triangular") {
        if(x < X)
            y = F * L * (x-X-L/2)
        else if(x < X + L)
            y = F * (L*x - X*L + X*x - (L**2+X**2+x**2)/2)
        else
            y = 0
        
        if(beamProperties["Support Type"] === "Simply Supported")
            y -= F * L * (2*X+L) / 2 / Lb * (x-Lb)
    }
    return y
}

function shearForceSingleLoad(x, load, beamProperties) {
    // Get relevant variables
    let X = load.Location
    let F = load.Mass * beamProperties.Gravity
    let L = load.Length
    let Lb = beamProperties["Length of Beam"]

    let y = 0
    if(load.Type === "Point") {
        if(x < X)
            y = F
        else if(x == X)
            // Array represents instantaneous change in y
            y = [F,0]
        else
            y = 0

        // For Cantilever, shear force at x=0 is F. For Simply Supported, it is something else, and the whole graph is translated down.
        if(beamProperties["Support Type"] === "Simply Supported") {
            if(Array.isArray(y)) {
                y[0] -= F * X / Lb
                y[1] -= F * X / Lb
            }
            else
                y -= F * X / Lb
        }
    }
    else if(load.Type === "Distributed") {
        if(x < X)
            y = F * L
        else if(x < X + L)
            y = F * (X + L - x)
        else
            y = 0
        
        // For Cantilever, shear force at x=0 is F*L. For Simply Supported, it is something else, and the whole graph is translated down.
        if(beamProperties["Support Type"] === "Simply Supported")
            y -= F * L * (2*X+L) / 2 / Lb
    }
    else if(load.Type === "Triangular") {
        if(x < X)
            y = F * L
        else if(x < X + L)
            y = F * (X + L - x)
        else
            y = 0
        
        // For Cantilever, shear force at x=0 is F*L. For Simply Supported, it is something else, and the whole graph is translated down.
        if(beamProperties["Support Type"] === "Simply Supported")
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
    
    return maxAbsVal * 1.5
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

// Function to pick name for a load, returning the first unoccupied load name like load1, load2, load3...
function getFreeName(loads){
    let loadNames = loads.map(load=>load.Name)
    let i = 1
    let name = "Load 1"
    while(loadNames.includes(name))
        name = "Load " + ++i
    return name
}

// Function to pick position for a load, returning the middle of the beam if beam length is valid, or 0 if it's invalid.
function getSafePosition(beamProperties){
    let length = beamProperties["Length of Beam"]
    // Check if length is not a number
    if(parseFloat(length) != length)
        return 0
    // Check if length <= 0
    length = Number(length)
    if(length <= 0) {
        return 0
    }
    return length / 2
}

// Function to pick a color for a load, returning a random color code with RGB components in the range 0-159, and opacity 50%.
function getRandomColor() {
    // R
    let R = Math.floor(Math.random() * 160).toString(16)
    if(R.length < 2)
        R = "0"+R
    // G
    let G = Math.floor(Math.random() * 160).toString(16)
    if(G.length < 2)
        G = "0"+G
    // B
    let B = Math.floor(Math.random() * 160).toString(16)
    if(B.length < 2)
        B = "0"+B
    "#" + R + G + B + "80"
}

export default CombinedLoadApp