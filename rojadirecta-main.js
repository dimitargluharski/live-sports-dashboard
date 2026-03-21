$(document).ready(function () {

  obtenerAgenda();

  // ==========================
  // Menú responsive
  // ==========================
  $("#menu-toggle").click(function () {
    $("#menu-modal").removeClass("hidden");
  });

  $("#menu-close").click(function () {
    $("#menu-modal").addClass("hidden");
  });

  $(document).on("click", ".toggle-submenu", function () {
    $(".toggle-submenu").not(this).siblings("ul").hide();
    $(this).siblings("ul").toggle();
  });

  $("#btnIframe").on("click", function () {
    window.location.reload();
  });

  setInterval(upgrade, 60000); // cada 1 min

  function convertToUserTimeZone(utcHour) {
    const DateTime = luxon.DateTime;
    const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
    const localDateTime = utcDateTime.toLocal();
    return localDateTime.toFormat("HH:mm");
  }

  function upgrade() {
    refrescarAgenda();
    console.log("⏱️ Agenda actualizada automáticamente");
  }

  // ==========================
  // Cargar agenda principal
  // ==========================
  function obtenerAgenda() {
    moment.locale("es");
    var url = "https://pltvhd.com/diaries.json"; // ahora desde Bunny CDN

    $("#accordion").empty();
    var html = "";

    $.getJSON(url, function (result) {
      if (!result || !result.data) {
        $(".title-agenda").html("Agenda - Sin datos disponibles");
        return;
      }

      var data = result.data.sort((a, b) =>
        a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
      );

      const dateCompleted = data.length
        ? moment(data[0].attributes.date_diary).format("LL")
        : moment().format("LL");

      $(".title-agenda").html("Agenda - " + dateCompleted);

      $.each(data, function (key, value) {
        if (!value || !value.attributes) return;

        let imageUrl =
          "https://cdn.pltvhd.com/uploads/sin_imagen_d36205f0e8.png";

        if (
          value.attributes.country &&
          value.attributes.country.data &&
          value.attributes.country.data.attributes.image &&
          value.attributes.country.data.attributes.image.data
        ) {
          imageUrl =
            "https://cdn.pltvhd.com" +
            value.attributes.country.data.attributes.image.data.attributes.url;
        }

        html += '<li class="p-2 hover:bg-gray-50 rounded-lg">';
        html +=
          '<div class="flex items-center cursor-pointer justify-between toggle-submenu">';
        html +=
          '<div class="flex items-center"><time datetime="' +
          value.attributes.diary_hour +
          '" class="w-12 text-center font-bold text-gray-700">' +
          convertToUserTimeZone(value.attributes.diary_hour) +
          "</time>";
        html +=
          '<img loading="lazy" src="' +
          imageUrl +
          '" alt="" class="ml-2 object-cover h-7 w-7"><span class="flex-1 ml-4 text-left font-medium text-gray-800 text-1xl">' +
          (value.attributes.diary_description || "Evento sin título") +
          "</span></div>";
        html += "</div>";

        html +=
          '<ul class="ml-16 rounded-lg submenu hidden divide-y divide-gray-300">';
        $.each(value.attributes.embeds.data, function (i, embed) {
          if (!embed || !embed.attributes) return;
          var url_complete = embed.attributes.embed_iframe
            ? embed.attributes.embed_iframe
            : "/star-plus";
          html +=
            '<div><a href="' +
            url_complete +
            '" target="_top" class="text-sm text-gray-700 hover:text-green-600"><li class="py-1 w-full"><img src="https://img.icons8.com/?size=10&id=59862&format=png&color=000000" class="inline mr-2" alt="play"/>' +
            embed.attributes.embed_name +
            "</li></a></div>";
        });
        html += "</ul></li>";
      });

      $("#accordion").append(html);
    }).fail(function () {
      console.error("❌ Error al cargar agenda desde BunnyCDN");
      $(".title-agenda").html("Agenda - Error al cargar datos");
    });
  }

  // ==========================
  // Refrescar agenda
  // ==========================
  function refrescarAgenda() {
    var agenda = "https://pltvhd.com/diaries.json";
    obtenerAgenda(); // reutiliza misma función
  }

  // ==========================
  // Parámetros y base64
  // ==========================
  function getParameterByName(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  function decodeBase64(str) {
    try {
      return atob(str);
    } catch (e) {
      console.error("Invalid base64 string", e);
      return null;
    }
  }

  const paramValue = getParameterByName("r");
  if (paramValue) {
    const decodedValue = decodeBase64(paramValue);
    $("#player_canal").attr("src", decodedValue);
  }
});
