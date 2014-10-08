// For variables that never change, I like to use
// CONSTANT (all caps) notation to immediately know that
// it is immutable in the app. 33.814oz per liter
var OZ = '.033814';

// Keeping the source data as separate from the DOM as possible makes it easier to integrate
// with a backend and keeps things a bit DRYer
// All of the UI components/variations can be derived from this one object
var DRINKS = {
  "bloody mary": [
    {ingredient: "vodka", units: 2, measurement: "ml"},
    {ingredient: "bloody mary mix", units: 4, measurement: "ml"},
    {ingredient: "celery stalk", units: 1, measurement: "dry"}
  ],
  "martini": [
    {ingredient: "gin", units: 2, measurement: "ml"},
    {ingredient: "dry vermouth", units: 1, measurement: "ml"},
    {ingredient: "olive", units: 1, measurement: "dry"}
  ],
  "margarita": [
    {ingredient: "tequila", units: 2, measurement: "ml"},
    {ingredient: "orange juice", units: 1, measurement: "oz"},
    {ingredient: "agave nectar", units: 1, measurement: "oz"},
    {ingredient: "lime", units: 1, measurement: "dry"}
  ]
};

// Render the data in templates, normally this is done in a more maintainable way
// but just wanted to show the concept
var ingredientTemplate = function(ingredient) {
  return "<p class=\"row\">\n  <span class=\"col-xs-2\">" + ingredient.units + "<span class=\"measurement\">" + ingredient.measurement + "</span></span>\n  <span class=\"col-xs-10\">" + ingredient.ingredient + "</span>\n</p>";
};

var drinkTemplate = function(drink, ingredients) {
  return "<div class=\"col-xs-12 col-md-4 col-lg-3 drink-container\" data-ingredients='" + JSON.stringify(ingredients) + "' data-available=\"true\" data-drink=\"" + drink + "\">\n  <div class=\"drink-title\">\n    <h3>" + drink + "</h3>\n  </div>\n  <div class=\"drink-content\">\n    <div class=\"drink-ingredients\">\n      " + (ingredientListTemplate(ingredients)) + "\n    </div>\n    <div class=\"drink-count row\">\n      <div class=\"col-xs-3 col-math\">\n        <a href=\"#\" class=\"btn-quantity btn-add active\">+</a>\n      </div>\n      <div class=\"col-xs-6\">\n        <input type=\"text\" class=\"input-drink-count\" readonly placeholder=\"-\">\n      </div>\n      <div class=\"col-xs-3 col-math\">\n        <a href=\"#\" class=\"btn-quantity btn-delete\">-</a>\n      </div>\n    </div>\n  </div>\n</div>";
};

var ingredientListTemplate = function(ingredients) {
  var ingredientsHtml = "";
  _.each(ingredients, function(ingredient) {
    return ingredientsHtml += ingredientTemplate(ingredient);
  });
  return ingredientsHtml;
};

function renderData() {
  var drinks = _.keys(DRINKS);
  var ingredients = _.map(DRINKS, function(drink) {return drink});
  _.each(drinks, function(drink, i) {
    $("#orders-container").append(drinkTemplate(drink, ingredients[i]))
  });
}

// function for filtering through the ingredients and updating the correct ingredient with correct oz measurement
// *1 covert passed oz to ML
// *2 if ML is >= 1000, divide by 1000 and change '.unit' to L
  // *2a remove trailing decimals if needed (testing only for .00 && .50)
// *3 update '.quantity' html to coverted
// *4 return either the ML/L unit and the converted unit
function toLiter(convert, ingredient) {
  var converted = Math.floor(convert / OZ),
      unit = 'ml';
  if (converted >= 1000) {
    converted = (converted / 1000).toFixed(2);
    if (converted.indexOf('.00')) {
      converted = converted.replace('.00', '');
    }
    if (converted.charAt('.50')) {
      converted = converted.replace('.50', '.5');
    }
    unit = 'l';
  }
  // console.log('converting: ' + convert + ' oz of ' + ingredient + ' to ' + converted , unit);
  return [converted, unit];
}

// function for updating changed drink
// *1 test for if drink is wet or dry
// *2 if ml, convert with toLiter(covert)
// *3 update data-quantity for data-ingredient
// *4 update ingredient with proper measurement
function updateDrink(convert, ingredient, measurement) {
  // console.log('diff for ' + ingredient +' is: ' + convert + measurement);
  var newQuantity = convert,
      newMeasurement = '';
  // *1
  if (measurement !== 'dry') {
    if (measurement === 'ml') { // *2
      getConverted = toLiter(convert, ingredient);
      newQuantity = getConverted[0];
      newMeasurement = getConverted[1];
    } else {
      newMeasurement = measurement;
    }
  }
  // *3 + *4
  $('.ingredient')
      .filter(function(index) {
        return $(this).attr('data-ingredient') === ingredient;
      })
      .attr('data-quantity', convert)
      .data('quantity', convert)
      .find('.quantity')
      .html(newQuantity)
      .next('.measurement')
      .html(newMeasurement);
}

var totalDrinks = 0;

// document load
$(function() {
  renderData();

  // function to convert original ML/L to oz if required
  // *1 test for if ml/l/oz by looking at '.measurement' to see if wet ingredient
  // *2 if L
    // *2a && contains '.', parseFloat(), else
    // *2b parseInt()
    // *2c convert to milileters and * by oz
  // *3 if ml, parseInt() && convert to oz
  // *4 mutliple new quantity of ml by oz. Leave regular oz measurements and dry ingredients alone
  // TODO: clean this up to render on page load via data templating
  $('.ingredient').each(function() {
    var self = $(this),
        quantity = self.find('.quantity').html(),
        measurement = self.find('.measurement').html();
    // *1
    if (self.find('.measurement').length) {
      if (measurement === 'l' || measurement === 'L') { // *2
        if (quantity.indexOf('.') > 0) { // *2a
          quantity = parseFloat(quantity);
        } else { // *2b
          quantity = parseInt(quantity, 10);
        }
        // *2c
        quantity = (quantity * 1000) * OZ;
      } else if (measurement === 'ml' || measurement === 'ML') {
        // *3
        quantity = parseInt(quantity, 10) * OZ;
      } else {
        // *4
        quantity = parseInt(quantity, 10);
      }
    }
    self.attr('data-quantity', quantity);
  });

  // function drinkAvail(nextDrink, available) {
  // For EACH drink
  // *1 Loop through each data-ingredients.ingredient if ingredient is available
  // *2 If data-ingredients.unit > ingredient, change available,data-available=false remove class 'active' from 'btn-add'
    // *2a if data-ingredients.unit <= ingredient, change available,data-available=true add class 'active' from 'btn-add'
  function drinkAvail() {
    $('.drink-container').each(function() {
      var self = $(this),
          addBtn = self.find('.btn-add'),
          drink = self.data('drink'),
          ingredients = self.data('ingredients'),
          thisI,
          thisU,
          barU,
          available = true,
          i = 0;
      while(ingredients[i] && available === true) {
        thisI = ingredients[i].ingredient;
        thisU = ingredients[i].units;
        barU = $('.ingredient[data-ingredient="' + thisI + '"]').data('quantity');
        // console.log(drink + ' needs: ' + thisI);
        // *2
        if (thisU > barU) {
          // console.log(thisI + ' is out for ' + drink);
          $('.drink-container[data-drink="' + drink + '"]')
            .data('available', false)
            .attr('data-available', false)
            .find('.btn-add')
            .removeClass('active');
          available = false;
        } else { // *2a
          $('.drink-container[data-drink="' + drink + '"]')
            .data('available', true)
            .attr('data-available', true)
            .find('.btn-add')
            .addClass('active');
          i++;
        }
      }
    });
  }

  // calculation function for adding/removing ingredient
  // *1 increase/decrease drink to order total
    // *1a if drink count > 0, add active class to 'btn-delete'
    // *1b if drink count = 0, remove active class and remove value
  // *2 Loop through all ingredients
    // *2a add/subtract ingredient unit from bar stock,
    // *2b pass diff, ingredient, and measurement through updateDrink
  // *3 drinkAvail() on all drinks
  // *4 update total drink counter
    // *4a if drink counter > 0, enable button
  $(document).on('click', '.btn-quantity', function(event) {
    event.preventDefault();
    var self = $(this),
        drink = self.parents('.drink-container'),
        countI = drink.find('.input-drink-count'),
        ingredients = drink.data('ingredients'),
        count,
        thisI,
        thisU,
        thisM,
        target,
        diff,
        loopIngredients = function(mathOp) {
          // *2
          for (var i = 0; i < ingredients.length; i++) {
            thisI = ingredients[i].ingredient;
            thisU = ingredients[i].units;
            thisM = ingredients[i].measurement;
            target = $('.ingredient[data-ingredient="' + thisI + '"]').data('quantity');
            diff = target + thisU;
            if (mathOp === 'addDrink') {
              diff = target +- thisU;
            }
            updateDrink(diff, thisI, thisM);
          }
        };
    if (countI.val() === undefined || countI.val() === '') {
      count = 0;
    } else {
      count = parseInt(countI.val(), 10);
    }
    if (self.hasClass('active')) {
      if (self.hasClass('btn-add')) {
        // *1
        count++;
        countI.val(count);
        // *1a
        if (count > 0) {
          drink
            .find('.btn-delete')
            .addClass('active');
        }
        // *2a
        loopIngredients('addDrink');
        // *4
        totalDrinks++;
      } else {
        // *1
        count--;
        // *1b
        if (count === 0) {
          countI.val('');
          self.removeClass('active');
        } else {
          countI.val(count);
        }
        // *2a
        loopIngredients('removeDrink');
        // *4
        totalDrinks--;
      }
      // *3
      drinkAvail();
    }
    // *4
    $('#summary-total')
      .find('.drink-count strong')
      .html(totalDrinks);
    if (totalDrinks > 0) {
      $('#submit-order')
        .removeClass('disabled');
    } else {
      $('#submit-order')
        .addClass('disabled');
    }
  });

  // function for adding orders to summary
  // *1 loop through each '.drink-container'
  // *2 assign variable for input value
  // *3 target summary drink and populate
  $(document).on('click', '#submit-order', function(evt) {
    if (!$(this).hasClass('disabled')) {
      $('.drink-container').each(function() {
        var self = $(this),
            drink = self.data('drink'),
            drinkCount = self.find('input').val();
        if (drinkCount < 1) {
          drinkCount = '-';
        }
        $('#order-summary .drink-total')
          .filter(function() {
            return $(this).attr('data-drink') === drink;
          })
          .find('.drink-count')
          .html(drinkCount);
        // console.log(drink + ' has a quantity of: ' + drinkCount);
      });
      $('html, body').animate({
        scrollTop: 0
      }, 700);
      $('main').addClass('transition');
      setTimeout(function() {
        $('main').hide();
        $('#order-summary').css('position', 'relative');
      }, 800);
      $('#order-summary').addClass('transition');
    }
  });
});
