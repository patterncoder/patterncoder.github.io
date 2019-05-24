

export class TimeSelector extends HTMLElement {
    constructor() {
        super();
        // Create a shadow root
		let shadow = this.attachShadow({mode: 'open'});
		let cmboBoxCont = document.createElement('div');
		cmboBoxCont.setAttribute('class', 'slds-combobox_container');
		
		let cmboBoxTrigger = document.createElement('div');
		cmboBoxTrigger.setAttribute('class', 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click');

		let cmboBoxInputCont = document.createElement('div');
		cmboBoxInputCont.setAttribute('class', 'slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right')
		

		let cmboInput = document.createElement('input');
		cmboInput.setAttribute('type', 'text');
		cmboInput.setAttribute('class', 'slds-input slds-combobox__input');
		

		let cmboListCont = document.createElement('div');
		cmboListCont.setAttribute('class', 'slds-dropdown slds-dropdown_length-5 slds-dropdown_fluid');
		cmboListCont.setAttribute('role', 'listbox');
		
		let cmboList = document.createElement('ul');
		cmboList.setAttribute('class', 'slds-listbox slds-listbox_vertical');

		let listItem = document.createElement('li');
		listItem.textContent = "hello";



		
		cmboBoxCont.appendChild(cmboBoxTrigger);
		cmboBoxTrigger.appendChild(cmboBoxInputCont);
		cmboBoxInputCont.appendChild(cmboInput);
		cmboBoxTrigger.appendChild(cmboListCont);
		cmboListCont.appendChild(cmboList);
		cmboList.appendChild(listItem);

		shadow.appendChild(cmboBoxCont);

        // let select = document.createElement('select');
        // for (const time of this.times) {
        //         var option = document.createElement("option");
        //         option.text = time;
        //         select.add(option);
        // }
        
    }
    
    times = [
        "00:00",
        "00:30",
        "01:00",
        "01:30",
        "02:00",
        "02:30",
        "03:00",
        "03:30",
        "04:00",
        "04:30",
        "05:00",
        "05:30",

    ]
}



customElements.define("time-selector", TimeSelector);
