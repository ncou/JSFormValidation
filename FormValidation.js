// FormValidation takes the form element as it's only parameter and provides full validation
// of that form asuming that the form has been setup correctly.
// Each form input that requires validation must have a data-validation attribute.
// data-validation attribute can contain any number of the below properties, sepparated by a single space
//
//     req
//     len:<min>-<max>
//     regex:<pattern_name>
//     match:<name_of_input_to_match>
//     radio:<name_of_radio_button_group>
//
// eg. <input name='username' type='text' data-validation='req len:5-16 regex:letters'>
//
//     This input will not appear valid until the field contains characters (req),
//     satisfies 5 < length < 16 (len:5-16), and matches the letters regex (regex:letters).
//
// Each input with a data-validation attribute also needs a matching <span> located somewhere
// near the input. The span must have an id of <input_name> + "-status"
//     eg. id='username-status' for the input shown above
// This span will display an error to the user. The span will gain a class of 'status-error'
// when there is an error message and a class of 'status-success' if the input is valid. These styles can be defined in
// CSS, perhaps red for an error and green for a success.
//
// FormValidation automatically finds the submit button and sets its 'disabled' property true unless all fields are valid.
// 
// Created by Lindsay Watt for CAB230


function FormValidation(form) {
    var regex_presets = {
        letters: /^[a-zA-Z]*$/, // letters only
        name: /^[a-zA-Z \-']*$/, // letters, spaces, - and '
        username: /^[a-zA-Z0-9_\.!?-]*$/, // letters, numbers, _ . ! ? and -
        numbers: /^[0-9]*$/, // numbers only
        phone: /^[0-9 \-+]*$/, // numbers, spaces, - and +
        date: /^\d{4}-\d{2}-\d{2}$/, // standard unix date format: YYYY-mm-dd
        // From https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
         email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        // Copyright (c) 2010-2013 Diego Perini, MIT licensed
        // https://gist.github.com/dperini/729294
        // see also https://mathiasbynens.be/demo/url-regex
        // modified to allow protocol-relative URLs
        //url: /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
        
        //https://gist.github.com/pkrefta/2378614
        url: /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i


    };

    var submit_button = form.querySelector('[type="submit"]'); // find the submit button
    var validation_fields = form.querySelectorAll('[data-validation]'); // find all the fields that need validating
    var fields = []; // this will hold an array of 'field objects' containing infomation about each field
    var VALID = "good"; // constant used to identify if a field is valid or not

    for (var i=0; i<validation_fields.length; ++i) {
        var field = validation_fields[i];

        // avoid empty validation string
        if (field.attributes['data-validation'].value.length > 0) {
            // construct an annonymous object for each field
            var field_object = {
                field: field,
                status_id: "#" + field.name + "-status",
                validation: field.attributes['data-validation'].value.split(" "),
                valid: false
                // validation is an array of each validation type specified for the field
            };
            // onchange event is required for radio and checkbox fields
            // whereas text based fields require oninput
            if (field.type == "checkbox" || field.type == "radio") {
                field.onchange = validate;
            } else {
                field.oninput = validate;
                field.onchange = validate;       
            }
            fields.push(field_object); // append the object to the array
        }
    }

    // When the page loads, run an initial validation
    // this will show the user which fields are required and which are not
    //window.onload = function() {
        //validate();
    //};

    // validates all inputs in the field array
    function validate() {

        // assume that the form is valid initially
        var form_valid = true;
        // validate each field using each type of validation specified for that field
        for (var i=0; i<fields.length; ++i) {
            var field = fields[i];
            for (var ii = 0; ii < field.validation.length; ++ii) {
                var status = doValidation(field.validation[ii], field);

                if (status === VALID) {
                    // set the appropriate 'status' element to show the 'Good' message
                    setStatus(field.status_id, "Good", "success");
                    field.field.className = "";
                    field.valid = true;
                } else {
                    // set the appropriate 'status' element to show the error message
                    setStatus(field.status_id, status, "error");
                    // add the error class to the input, sets the border red
                    field.field.className = "error";
                    // the form is no longer valid since one field returned an error
                    form_valid = false;
                    field.valid = false;
                    // break on the first error found for this field, and move to the next one
                    break;
                }
            }
        }
        // set the disabled attribute of the button
        // TODO : à virer
        submit_button.disabled = !form_valid;
        return form_valid;

    }

    // takes a single validation command and the field object
    // returns the VALID flag if valid or an error message if not
    function doValidation(validation_string, field_ob) {
        // split the validation command so the parameters can be indexed
        var type = validation_string.split(":");
        // get the value of the field
        var string = field_ob.field.value.trim();

        // case structure runs approptiate actions depending on the validation command string
        switch (type[0]) {
            case "len":
                // min and max are indexed from the command string
                var min = parseInt(type[1].split("-")[0]);
                var max = parseInt(type[1].split("-")[1]);
                if (string.length < min) {
                    return "Must be longer than " + min + " characters";
                } else if (string.length > max) {
                    return "Must be shorter than " + max + " characters";
                }
                break;
            case "regex":
                // get the regex pattern from the preset regex array
                var preset = regex_presets[type[1]];
                if (!preset.test(string)) {
                    if (type[1] == "email") {
                        if (string.length == 0)
                            break;
                        // for email regex, provide a more helpful error message
                        return "Not a valid email address";
                    }
                    // if the string does not match regex, must contain invalid characters
                    return "Contains invalid characters";
                }
                break;
            case "match":
                // used for matching password and confirm password mainly
                // finds the value of the matching field in the form and compares them
                if (string != form.querySelector("[name='" + type[1] + "']").value) {
                    return "Does not match";
                }
                break;
            case "req":
                // use this for all required fields

                if ( field_ob.field.nodeName.toLowerCase() === "select" ) {
                    // Could be an array for select-multiple or a string, both are fine this way
                    if (!string  || string.length === 0) {
                        return "Required";   
                    }
                }

                if ( field_ob.field.type === "checkbox" ) {
                    if (field_ob.field.checked === false) {
                        return "Required";   
                    }
                }


                if (string.length === 0) {
                    return "Required";   
                }



                break;
            case "checkbox":
                var min = parseInt(type[2].split("-")[0]);
                var max = parseInt(type[2].split("-")[1]);
                var boxes = form.querySelectorAll("[name='" + type[1] + "']");
                var num_checked = 0;
                for (var j = 0; j < boxes.length; ++j) {
                    if (boxes[j].checked) {
                        ++num_checked;
                    }
                }
                if (num_checked === 0 && min > 0) {
                    return "Required";
                }
                if (num_checked < min) {
                    return "Select at least " + min;
                }
                if (num_checked > max) {
                    return "Select " + max + " at most";
                }
                break;
            case "radio":
                // confirms that only one radio button is selected per group
                var radios = form.querySelectorAll("[name='" + type[1] + "']");
                var num_checked = 0;
                for (var j = 0; j < radios.length; ++j) {
                    if (radios[j].checked) {
                        ++num_checked;
                    }
                }
                if (num_checked != 1) {
                    return "Required";
                }
                break;
            case "or":
                var other;
                for (var j=0; j<fields.length; ++j) {
                    if (fields[j].field.name === type[1])
                        other = fields[j];
                }
                var other_len = other.field.value.trim().length;
                var len = string.length;

                if ((len == 0 && other_len == 0) || (!other.valid && other_len != 0)) {
                    return "Either this or " + type[2] + " must be filled in";
                }
        }
        // if string has passed all validation, return the VALID flag
        return VALID;
    }

    function setStatus(status_id, text, type) {
        var s = document.querySelector(status_id);
        if (type === "success") {
            text = '<i class="fa fa-check"></i> ' + text;
        } else {
            text = '<i class="fa fa-times"></i> ' + text;
        }
        s.innerHTML = text;
        s.className = s.className.replace(" status-success", "");
        s.className = s.className.replace(" status-error", "");
        s.className += " status-" + type;
        s.style.visibility = "visible";
    }

    // run the validation
    return validate();

}