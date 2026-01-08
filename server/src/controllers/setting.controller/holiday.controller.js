import Holiday from "../../models/setting.model/holidays.model.js";

// Create a new Holiday
export const createHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;

    const holiday = await Holiday.create({ name, date, description });

    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all holidays
export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single holiday by ID
export const getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id).lean();

    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    res.status(200).json({ success: true, data: holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update holiday
export const updateHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { name, date, description },
      { new: true }
    );

    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete holiday
export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
