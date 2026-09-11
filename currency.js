



const BASE_URL = "https://open.er-api.com/v6/latest/";

const dropdowns = document.querySelectorAll(".dropdown select");
const btn = document.querySelector("form button");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const msg = document.querySelector(".msg");


window.addEventListener("load", () =>{
    updateExchangeRate();
})

for(let select of dropdowns){
    for(currCode in countryList){
        let newOption = document.createElement("option");
        newOption.innerText = currCode;
        newOption.value = currCode;
        if(select.name === "from" && currCode === "USD"){
            newOption.selected = "selected";
        } else if(select.name === "to" && currCode === "INR"){
            newOption.selected = "selected";
        }
        select.append(newOption);
    }

    select.addEventListener("change", (evt) => {
        updateFlag(evt.target);
    });
}



const updateFlag = (element) => {
    let currCode = element.value;
    let countryCode = countryList[currCode];
    let newSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
    let img = element.parentElement.querySelector("img");
    img.src = newSrc;
};


btn.addEventListener("click", (evt) =>{
    evt.preventDefault();
    updateExchangeRate();
});

const updateExchangeRate = async () =>{
    let amount = document.querySelector(".amount input");
    let amtval = amount.value;
    if(amtval === "" || amtval < 1){
        amtval = 1;
        amount.value = "1";
    }

    const URL = `${BASE_URL}${fromCurr.value}`;

    let response = await fetch(URL);
    let data = await response.json();

    let rate = data.rates[toCurr.value];
    let finalamount = (amtval * rate).toFixed(2);
    msg.innerText = `${amtval} ${fromCurr.value} = ${finalamount} ${toCurr.value}`;
}







